const { getR2Config } = require("../config/r2");

const MAX_IMAGE_URL = 2048;

function trimOrNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

/**
 * Optional https image URL under R2_PUBLIC_BASE_URL (same rules as business covers).
 * `null` / empty clears the image.
 */
function parseOptionalR2ImageUrl(value, field = "imageUrl") {
  if (value === null) return { value: null };
  const url = trimOrNull(String(value));
  if (!url) return { value: null };
  if (url.length > MAX_IMAGE_URL) {
    return {
      error: {
        status: 400,
        message: `\`${field}\` must be at most ${MAX_IMAGE_URL} characters`,
        errors: [{ field, code: "too_long" }],
      },
    };
  }
  if (!/^https:\/\//i.test(url)) {
    return {
      error: {
        status: 400,
        message: `\`${field}\` must be an https URL`,
        errors: [{ field, code: "invalid" }],
      },
    };
  }

  const { isConfigured, publicBaseUrl } = getR2Config();
  if (!isConfigured || !publicBaseUrl) {
    return {
      error: {
        status: 503,
        message:
          "Image storage is not configured. Set R2_* keys before saving an image.",
        errors: [{ field, code: "r2_not_configured" }],
      },
    };
  }

  const allowedPrefix = `${publicBaseUrl}/`;
  if (!url.startsWith(allowedPrefix)) {
    return {
      error: {
        status: 400,
        message: `\`${field}\` must be an object URL under R2_PUBLIC_BASE_URL`,
        errors: [{ field, code: "invalid_host" }],
      },
    };
  }

  return { value: url };
}

module.exports = {
  MAX_IMAGE_URL,
  parseOptionalR2ImageUrl,
};
