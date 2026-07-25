const { Op } = require("sequelize");
const { getR2Config } = require("../config/r2");
const { db } = require("../models");
const {
  BUSINESS_CATEGORIES,
  isBusinessCategory,
} = require("../constants/businessCategories");

const MAX_NAME = 120;
const MAX_ADDRESS = 255;
const MAX_DESCRIPTION = 2000;
const MAX_PHONE = 40;
const MAX_COVER_URL = 2048;

function parseOptionalPhone(value, field) {
  if (value === null) return { value: null };
  const phone = trimOrNull(String(value));
  if (phone && phone.length > MAX_PHONE) {
    return {
      error: {
        status: 400,
        message: `\`${field}\` must be at most ${MAX_PHONE} characters`,
        errors: [{ field, code: "too_long" }],
      },
    };
  }
  return { value: phone };
}

/**
 * Cover URLs must be https and under R2_PUBLIC_BASE_URL (no arbitrary hotlinks).
 * `null` / empty clears the cover.
 */
function parseOptionalCoverUrl(value) {
  if (value === null) return { value: null };
  const url = trimOrNull(String(value));
  if (!url) return { value: null };
  if (url.length > MAX_COVER_URL) {
    return {
      error: {
        status: 400,
        message: `\`coverImageUrl\` must be at most ${MAX_COVER_URL} characters`,
        errors: [{ field: "coverImageUrl", code: "too_long" }],
      },
    };
  }
  if (!/^https:\/\//i.test(url)) {
    return {
      error: {
        status: 400,
        message: "`coverImageUrl` must be an https URL",
        errors: [{ field: "coverImageUrl", code: "invalid" }],
      },
    };
  }

  const { isConfigured, publicBaseUrl } = getR2Config();
  if (!isConfigured || !publicBaseUrl) {
    return {
      error: {
        status: 503,
        message:
          "Image storage is not configured. Set R2_* keys before saving a cover.",
        errors: [{ field: "coverImageUrl", code: "r2_not_configured" }],
      },
    };
  }

  const allowedPrefix = `${publicBaseUrl}/`;
  if (!url.startsWith(allowedPrefix)) {
    return {
      error: {
        status: 400,
        message:
          "`coverImageUrl` must be an object URL under R2_PUBLIC_BASE_URL",
        errors: [{ field: "coverImageUrl", code: "invalid_host" }],
      },
    };
  }

  return { value: url };
}

function isAdmin(user) {
  return Boolean(user && user.role === "admin");
}

function canMutateBusiness(user, business) {
  if (!user || !business) return false;
  if (isAdmin(user)) return true;
  return business.createdByUserId === user.id;
}

function trimOrNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function trimRequired(value, field) {
  if (value === undefined || value === null || typeof value !== "string") {
    return {
      error: {
        status: 400,
        message: `\`${field}\` is required`,
        errors: [{ field, code: "required" }],
      },
    };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      error: {
        status: 400,
        message: `\`${field}\` is required`,
        errors: [{ field, code: "required" }],
      },
    };
  }
  return { value: trimmed };
}

function toPublicBusiness(business) {
  return {
    id: business.id,
    name: business.name,
    category: business.category,
    description: business.description,
    address: business.address,
    phone: business.phone,
    whatsapp: business.whatsapp,
    coverImageUrl: business.coverImageUrl,
    isFeatured: Boolean(business.isFeatured),
    ratingAvg: Number(business.ratingAvg) || 0,
    reviewCount: business.reviewCount || 0,
    createdByUserId: business.createdByUserId,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
  };
}

function parseCreateInput(body) {
  if (!body || typeof body !== "object") {
    return {
      error: {
        status: 400,
        message: "Request body is required",
        errors: [{ code: "invalid_body" }],
      },
    };
  }

  const nameParsed = trimRequired(body.name, "name");
  if (nameParsed.error) return nameParsed;
  if (nameParsed.value.length > MAX_NAME) {
    return {
      error: {
        status: 400,
        message: `\`name\` must be at most ${MAX_NAME} characters`,
        errors: [{ field: "name", code: "too_long" }],
      },
    };
  }

  if (!isBusinessCategory(body.category)) {
    return {
      error: {
        status: 400,
        message: `\`category\` must be one of: ${BUSINESS_CATEGORIES.join(", ")}`,
        errors: [{ field: "category", code: "invalid" }],
      },
    };
  }

  const addressParsed = trimRequired(body.address, "address");
  if (addressParsed.error) return addressParsed;
  if (addressParsed.value.length > MAX_ADDRESS) {
    return {
      error: {
        status: 400,
        message: `\`address\` must be at most ${MAX_ADDRESS} characters`,
        errors: [{ field: "address", code: "too_long" }],
      },
    };
  }

  let description = null;
  if (body.description !== undefined && body.description !== null) {
    description = trimOrNull(String(body.description));
    if (description && description.length > MAX_DESCRIPTION) {
      return {
        error: {
          status: 400,
          message: `\`description\` must be at most ${MAX_DESCRIPTION} characters`,
          errors: [{ field: "description", code: "too_long" }],
        },
      };
    }
  }

  const phoneParsed = parseOptionalPhone(
    body.phone !== undefined && body.phone !== null ? body.phone : null,
    "phone",
  );
  if (phoneParsed.error) return phoneParsed;

  const whatsappParsed = parseOptionalPhone(
    body.whatsapp !== undefined && body.whatsapp !== null
      ? body.whatsapp
      : null,
    "whatsapp",
  );
  if (whatsappParsed.error) return whatsappParsed;

  let coverImageUrl = null;
  if (body.coverImageUrl !== undefined && body.coverImageUrl !== null) {
    const coverParsed = parseOptionalCoverUrl(body.coverImageUrl);
    if (coverParsed.error) return coverParsed;
    coverImageUrl = coverParsed.value;
  }

  return {
    data: {
      name: nameParsed.value,
      category: body.category,
      address: addressParsed.value,
      description,
      phone: phoneParsed.value,
      whatsapp: whatsappParsed.value,
      coverImageUrl,
    },
  };
}

function parseUpdateInput(body) {
  if (!body || typeof body !== "object") {
    return {
      error: {
        status: 400,
        message: "Request body is required",
        errors: [{ code: "invalid_body" }],
      },
    };
  }

  const patch = {};

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    const nameParsed = trimRequired(body.name, "name");
    if (nameParsed.error) return nameParsed;
    if (nameParsed.value.length > MAX_NAME) {
      return {
        error: {
          status: 400,
          message: `\`name\` must be at most ${MAX_NAME} characters`,
          errors: [{ field: "name", code: "too_long" }],
        },
      };
    }
    patch.name = nameParsed.value;
  }

  if (Object.prototype.hasOwnProperty.call(body, "category")) {
    if (!isBusinessCategory(body.category)) {
      return {
        error: {
          status: 400,
          message: `\`category\` must be one of: ${BUSINESS_CATEGORIES.join(", ")}`,
          errors: [{ field: "category", code: "invalid" }],
        },
      };
    }
    patch.category = body.category;
  }

  if (Object.prototype.hasOwnProperty.call(body, "address")) {
    const addressParsed = trimRequired(body.address, "address");
    if (addressParsed.error) return addressParsed;
    if (addressParsed.value.length > MAX_ADDRESS) {
      return {
        error: {
          status: 400,
          message: `\`address\` must be at most ${MAX_ADDRESS} characters`,
          errors: [{ field: "address", code: "too_long" }],
        },
      };
    }
    patch.address = addressParsed.value;
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    patch.description =
      body.description === null
        ? null
        : trimOrNull(String(body.description));
    if (patch.description && patch.description.length > MAX_DESCRIPTION) {
      return {
        error: {
          status: 400,
          message: `\`description\` must be at most ${MAX_DESCRIPTION} characters`,
          errors: [{ field: "description", code: "too_long" }],
        },
      };
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    const phoneParsed = parseOptionalPhone(body.phone, "phone");
    if (phoneParsed.error) return phoneParsed;
    patch.phone = phoneParsed.value;
  }

  if (Object.prototype.hasOwnProperty.call(body, "whatsapp")) {
    const whatsappParsed = parseOptionalPhone(body.whatsapp, "whatsapp");
    if (whatsappParsed.error) return whatsappParsed;
    patch.whatsapp = whatsappParsed.value;
  }

  if (Object.prototype.hasOwnProperty.call(body, "coverImageUrl")) {
    const coverParsed = parseOptionalCoverUrl(body.coverImageUrl);
    if (coverParsed.error) return coverParsed;
    patch.coverImageUrl = coverParsed.value;
  }

  if (Object.keys(patch).length === 0) {
    return {
      error: {
        status: 400,
        message: "No updatable fields provided",
        errors: [{ code: "empty_patch" }],
      },
    };
  }

  return { data: patch };
}

async function listBusinesses({ category } = {}) {
  const where = {};
  if (category) {
    if (!isBusinessCategory(category)) {
      return {
        error: {
          status: 400,
          message: `\`category\` must be one of: ${BUSINESS_CATEGORIES.join(", ")}`,
          errors: [{ field: "category", code: "invalid" }],
        },
      };
    }
    where.category = category;
  }

  const businesses = await db.Business.findAll({
    where,
    order: [
      ["isFeatured", "DESC"],
      ["name", "ASC"],
    ],
  });

  return { businesses };
}

async function listBusinessesForUser(userId) {
  return db.Business.findAll({
    where: { createdByUserId: userId },
    order: [["updatedAt", "DESC"]],
  });
}

async function getBusinessById(id) {
  return db.Business.findByPk(id);
}

async function createBusiness(userId, body) {
  const parsed = parseCreateInput(body);
  if (parsed.error) return { error: parsed.error };

  const business = await db.Business.create({
    ...parsed.data,
    createdByUserId: userId,
    isFeatured: false,
    ratingAvg: 0,
    reviewCount: 0,
  });

  return { business };
}

async function updateBusiness(actor, businessId, body) {
  const business = await getBusinessById(businessId);
  if (!business) {
    return {
      error: {
        status: 404,
        message: "Business not found",
        errors: [{ code: "not_found" }],
      },
    };
  }

  if (!canMutateBusiness(actor, business)) {
    return {
      error: {
        status: 403,
        message: "Forbidden — you can only edit your own listings",
        errors: [{ code: "forbidden" }],
      },
    };
  }

  const parsed = parseUpdateInput(body);
  if (parsed.error) return { error: parsed.error };

  await business.update(parsed.data);
  await business.reload();
  return { business };
}

async function deleteBusiness(actor, businessId) {
  const business = await getBusinessById(businessId);
  if (!business) {
    return {
      error: {
        status: 404,
        message: "Business not found",
        errors: [{ code: "not_found" }],
      },
    };
  }

  if (!canMutateBusiness(actor, business)) {
    return {
      error: {
        status: 403,
        message: "Forbidden — you can only delete your own listings",
        errors: [{ code: "forbidden" }],
      },
    };
  }

  const snapshot = toPublicBusiness(business);
  await business.destroy();
  return { business: snapshot };
}

async function toggleFeatured(businessId) {
  const business = await getBusinessById(businessId);
  if (!business) {
    return {
      error: {
        status: 404,
        message: "Business not found",
        errors: [{ code: "not_found" }],
      },
    };
  }

  await business.update({ isFeatured: !business.isFeatured });
  await business.reload();
  return { business };
}

async function searchBusinessesByQuery(query) {
  const q = (query || "").trim();
  if (!q) return [];

  return db.Business.findAll({
    where: {
      [Op.or]: [
        { name: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
        { address: { [Op.iLike]: `%${q}%` } },
      ],
    },
    order: [
      ["isFeatured", "DESC"],
      ["name", "ASC"],
    ],
    limit: 40,
  });
}

module.exports = {
  BUSINESS_CATEGORIES,
  toPublicBusiness,
  canMutateBusiness,
  listBusinesses,
  listBusinessesForUser,
  getBusinessById,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  toggleFeatured,
  searchBusinessesByQuery,
};
