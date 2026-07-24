/**
 * Cloudflare R2 (S3-compatible) config from env.
 * Secrets stay on the server only — never ship to Expo.
 *
 * Fill these in `.env` when you have Cloudflare keys:
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   R2_PUBLIC_BASE_URL  (public bucket / custom domain, no trailing slash)
 */

function trim(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function getR2Config() {
  const accountId = trim(process.env.R2_ACCOUNT_ID);
  const accessKeyId = trim(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = trim(process.env.R2_SECRET_ACCESS_KEY);
  const bucketName = trim(process.env.R2_BUCKET_NAME);
  const publicBaseUrl = trim(process.env.R2_PUBLIC_BASE_URL).replace(
    /\/$/,
    "",
  );

  const isConfigured = Boolean(
    accountId &&
      accessKeyId &&
      secretAccessKey &&
      bucketName &&
      publicBaseUrl,
  );

  return {
    isConfigured,
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
    /** S3 API endpoint for this Cloudflare account. */
    endpoint: accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : "",
  };
}

module.exports = { getR2Config };
