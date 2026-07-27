const { randomUUID } = require("crypto");
const {
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { getR2Config } = require("../config/r2");

const ALLOWED_FOLDERS = new Set(["businesses/covers", "community/posts"]);
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
/** Hard cap for R2 image uploads (bytes) — covers + community photos. */
const MAX_COVER_BYTES = 5 * 1024 * 1024;

let cachedClient = null;
let cachedKey = "";

function getClient() {
  const config = getR2Config();
  if (!config.isConfigured) {
    return null;
  }

  const cacheKey = [
    config.accountId,
    config.accessKeyId,
    config.bucketName,
  ].join("|");

  if (cachedClient && cachedKey === cacheKey) {
    return cachedClient;
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // AWS SDK v3 defaults can sign checksum headers Expo/R2 clients do not send → 403.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  cachedKey = cacheKey;
  return cachedClient;
}

function notConfiguredError() {
  return {
    status: 503,
    message:
      "Image storage is not configured yet. Set R2_* keys in the API .env.",
    errors: [{ code: "r2_not_configured" }],
  };
}

function publicUrlForKey(objectKey) {
  const config = getR2Config();
  return `${config.publicBaseUrl}/${objectKey.replace(/^\//, "")}`;
}

/**
 * Build a namespaced object key, e.g. businesses/covers/{userId}/{uuid}.jpg
 */
function buildObjectKey({ folder, userId, filename }) {
  const safeFolder = String(folder || "businesses/covers")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/^\/+|\/+$/g, "");
  if (!ALLOWED_FOLDERS.has(safeFolder)) {
    return { error: true, safeFolder };
  }
  const extMatch = String(filename || "").match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
  const id = randomUUID();
  const owner = userId != null ? String(userId) : "anon";
  return { objectKey: `${safeFolder}/${owner}/${id}.${ext}` };
}

function getStorageStatus() {
  const config = getR2Config();
  return {
    configured: config.isConfigured,
    bucket: config.isConfigured ? config.bucketName : null,
    publicBaseUrl: config.isConfigured ? config.publicBaseUrl : null,
    provider: "cloudflare-r2",
    maxBytes: MAX_COVER_BYTES,
  };
}

function parseByteSize(value) {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return {
      error: {
        status: 400,
        message: "`byteSize` must be a positive number",
        errors: [{ field: "byteSize", code: "invalid" }],
      },
    };
  }
  return { value: Math.trunc(n) };
}

/**
 * Presigned PUT so the mobile client can upload directly to R2.
 * Returns error until R2_* env vars are filled.
 * Requires `byteSize` ≤ 5 MB (validated here; not signed into the URL —
 * Expo upload size can differ slightly from picker metadata and a signed
 * ContentLength mismatch returns R2 403).
 */
async function createPresignedUpload({
  userId,
  folder = "businesses/covers",
  contentType = "image/jpeg",
  filename = "cover.jpg",
  byteSize,
  expiresInSeconds = 300,
}) {
  const config = getR2Config();
  if (!config.isConfigured) {
    return { error: notConfiguredError() };
  }

  const sizeParsed = parseByteSize(byteSize);
  if (sizeParsed.error) return { error: sizeParsed.error };
  if (sizeParsed.value == null) {
    return {
      error: {
        status: 400,
        message: "`byteSize` is required (file size in bytes)",
        errors: [{ field: "byteSize", code: "required" }],
      },
    };
  }
  if (sizeParsed.value > MAX_COVER_BYTES) {
    return {
      error: {
        status: 400,
        message: "Cover photo must be 5 MB or smaller",
        errors: [{ field: "byteSize", code: "too_large", maxBytes: MAX_COVER_BYTES }],
      },
    };
  }

  const normalizedType = String(contentType || "").toLowerCase().trim();
  if (!ALLOWED_CONTENT_TYPES.has(normalizedType)) {
    return {
      error: {
        status: 400,
        message: "`contentType` must be image/jpeg, image/png, or image/webp",
        errors: [{ field: "contentType", code: "invalid" }],
      },
    };
  }

  const keyResult = buildObjectKey({ folder, userId, filename });
  if (keyResult.error) {
    return {
      error: {
        status: 400,
        message: `\`folder\` must be one of: ${[...ALLOWED_FOLDERS].join(", ")}`,
        errors: [{ field: "folder", code: "invalid" }],
      },
    };
  }

  const client = getClient();
  // Only ContentType is signed — client must send the same Content-Type header.
  // Do not sign ContentLength (breaks Expo FileSystem / edited picker assets).
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: keyResult.objectKey,
    ContentType: normalizedType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    data: {
      uploadUrl,
      objectKey: keyResult.objectKey,
      publicUrl: publicUrlForKey(keyResult.objectKey),
      expiresInSeconds,
      contentType: normalizedType,
      maxBytes: MAX_COVER_BYTES,
      byteSize: sizeParsed.value,
    },
  };
}

/**
 * Server-side put (optional path). Prefer presigned client upload for mobile.
 */
async function uploadBuffer({
  userId,
  folder = "businesses/covers",
  buffer,
  contentType = "image/jpeg",
  filename = "cover.jpg",
}) {
  const config = getR2Config();
  if (!config.isConfigured) {
    return { error: notConfiguredError() };
  }
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return {
      error: {
        status: 400,
        message: "Image buffer is required",
        errors: [{ code: "invalid_body" }],
      },
    };
  }

  if (buffer.length > MAX_COVER_BYTES) {
    return {
      error: {
        status: 400,
        message: "Cover photo must be 5 MB or smaller",
        errors: [{ code: "too_large", maxBytes: MAX_COVER_BYTES }],
      },
    };
  }

  const normalizedType = String(contentType || "").toLowerCase().trim();
  if (!ALLOWED_CONTENT_TYPES.has(normalizedType)) {
    return {
      error: {
        status: 400,
        message: "`contentType` must be image/jpeg, image/png, or image/webp",
        errors: [{ field: "contentType", code: "invalid" }],
      },
    };
  }

  const keyResult = buildObjectKey({ folder, userId, filename });
  if (keyResult.error) {
    return {
      error: {
        status: 400,
        message: `\`folder\` must be one of: ${[...ALLOWED_FOLDERS].join(", ")}`,
        errors: [{ field: "folder", code: "invalid" }],
      },
    };
  }

  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: keyResult.objectKey,
      Body: buffer,
      ContentType: normalizedType,
    }),
  );

  return {
    data: {
      objectKey: keyResult.objectKey,
      publicUrl: publicUrlForKey(keyResult.objectKey),
      contentType: normalizedType,
    },
  };
}

async function deleteObject(objectKey) {
  const config = getR2Config();
  if (!config.isConfigured) {
    return { error: notConfiguredError() };
  }
  if (!objectKey || typeof objectKey !== "string") {
    return {
      error: {
        status: 400,
        message: "`objectKey` is required",
        errors: [{ field: "objectKey", code: "required" }],
      },
    };
  }

  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey.replace(/^\//, ""),
    }),
  );

  return { data: { objectKey } };
}

module.exports = {
  MAX_COVER_BYTES,
  getStorageStatus,
  createPresignedUpload,
  uploadBuffer,
  deleteObject,
  publicUrlForKey,
};
