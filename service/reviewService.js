const { db } = require("../models");

const MAX_COMMENT = 2000;

function isAdmin(user) {
  return Boolean(user && user.role === "admin");
}

/** Owner or admin may edit/delete. */
function canMutateReview(user, review) {
  if (!user || !review) return false;
  if (isAdmin(user)) return true;
  return review.createdByUserId === user.id;
}

function toPublicAuthor(user) {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    role: user.role,
  };
}

function authorDisplayName(author) {
  if (!author) return "Neighbour";
  const name = [author.firstName, author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || "Neighbour";
}

function toPublicReview(review) {
  const author = review.author || null;
  return {
    id: review.id,
    businessId: review.businessId,
    rating: review.rating,
    comment: review.comment,
    createdByUserId: review.createdByUserId,
    author: toPublicAuthor(author),
    authorName: authorDisplayName(author),
    authorAvatarUrl: author?.imageUrl || null,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

function authorInclude() {
  return {
    model: db.User,
    as: "author",
    attributes: ["id", "firstName", "lastName", "imageUrl", "role"],
  };
}

function parseRating(value) {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return {
      error: {
        status: 400,
        message: "`rating` must be an integer from 1 to 5",
        errors: [{ field: "rating", code: "invalid" }],
      },
    };
  }
  return { value: rating };
}

function parseComment(value) {
  if (value === undefined || value === null || typeof value !== "string") {
    return {
      error: {
        status: 400,
        message: "`comment` is required",
        errors: [{ field: "comment", code: "required" }],
      },
    };
  }
  const comment = value.trim();
  if (!comment) {
    return {
      error: {
        status: 400,
        message: "`comment` is required",
        errors: [{ field: "comment", code: "required" }],
      },
    };
  }
  if (comment.length > MAX_COMMENT) {
    return {
      error: {
        status: 400,
        message: `\`comment\` must be at most ${MAX_COMMENT} characters`,
        errors: [{ field: "comment", code: "too_long" }],
      },
    };
  }
  return { value: comment };
}

/**
 * Recalculate Business.ratingAvg + reviewCount from reviews table.
 */
async function refreshBusinessRatings(businessId, transaction) {
  const rows = await db.BusinessReview.findAll({
    where: { businessId },
    attributes: ["rating"],
    transaction,
  });
  const reviewCount = rows.length;
  let ratingAvg = 0;
  if (reviewCount > 0) {
    const sum = rows.reduce((acc, row) => acc + row.rating, 0);
    ratingAvg = Math.round((sum / reviewCount) * 10) / 10;
  }
  await db.Business.update(
    { ratingAvg, reviewCount },
    { where: { id: businessId }, transaction },
  );
  return { ratingAvg, reviewCount };
}

async function listReviewsForBusiness(businessId) {
  const id = Number(businessId);
  if (!Number.isInteger(id) || id < 1) {
    return {
      error: {
        status: 400,
        message: "Invalid business id",
        errors: [{ field: "businessId", code: "invalid" }],
      },
    };
  }

  const business = await db.Business.findByPk(id, { attributes: ["id"] });
  if (!business) {
    return {
      error: {
        status: 404,
        message: "Business not found",
        errors: [{ code: "not_found" }],
      },
    };
  }

  const reviews = await db.BusinessReview.findAll({
    where: { businessId: id },
    include: [authorInclude()],
    order: [["createdAt", "DESC"]],
  });

  return { reviews, businessId: id };
}

async function createReview(actor, businessId, body) {
  if (!actor?.id) {
    return {
      error: {
        status: 401,
        message: "Sign in required",
        errors: [{ code: "unauthorized" }],
      },
    };
  }

  const id = Number(businessId);
  if (!Number.isInteger(id) || id < 1) {
    return {
      error: {
        status: 400,
        message: "Invalid business id",
        errors: [{ field: "businessId", code: "invalid" }],
      },
    };
  }

  const business = await db.Business.findByPk(id, {
    attributes: ["id", "name", "createdByUserId"],
  });
  if (!business) {
    return {
      error: {
        status: 404,
        message: "Business not found",
        errors: [{ code: "not_found" }],
      },
    };
  }

  if (!body || typeof body !== "object") {
    return {
      error: {
        status: 400,
        message: "Request body is required",
        errors: [{ code: "invalid_body" }],
      },
    };
  }

  const ratingParsed = parseRating(body.rating);
  if (ratingParsed.error) return ratingParsed;
  const commentParsed = parseComment(body.comment);
  if (commentParsed.error) return commentParsed;

  const existing = await db.BusinessReview.findOne({
    where: { businessId: id, createdByUserId: actor.id },
  });
  if (existing) {
    return {
      error: {
        status: 409,
        message: "You already reviewed this listing. Edit your existing review.",
        errors: [{ code: "already_reviewed" }],
      },
    };
  }

  const transaction = await db.sequelize.transaction();
  try {
    const review = await db.BusinessReview.create(
      {
        businessId: id,
        createdByUserId: actor.id,
        rating: ratingParsed.value,
        comment: commentParsed.value,
      },
      { transaction },
    );
    const aggregates = await refreshBusinessRatings(id, transaction);
    await transaction.commit();

    const withAuthor = await db.BusinessReview.findByPk(review.id, {
      include: [authorInclude()],
    });

    // Notify listing owner (skip self). Best-effort — never fail the review.
    try {
      const notificationService = require("./notificationService");
      await notificationService.notifyUser({
        userId: business.createdByUserId,
        type: "business_update",
        title: `${authorDisplayName(actor)} reviewed your listing`,
        body: `New ${ratingParsed.value}-star review on “${business.name}”.`,
        actorUserId: actor.id,
        actorName: authorDisplayName(actor),
        actorAvatarUrl: actor.imageUrl || null,
        targetType: "business",
        targetId: business.id,
      });
    } catch (_) {
      // Inbox is best-effort.
    }

    return { review: withAuthor, aggregates };
  } catch (error) {
    await transaction.rollback();
    if (error?.name === "SequelizeUniqueConstraintError") {
      return {
        error: {
          status: 409,
          message:
            "You already reviewed this listing. Edit your existing review.",
          errors: [{ code: "already_reviewed" }],
        },
      };
    }
    throw error;
  }
}

async function updateReview(actor, reviewId, body) {
  const id = Number(reviewId);
  if (!Number.isInteger(id) || id < 1) {
    return {
      error: {
        status: 400,
        message: "Invalid review id",
        errors: [{ field: "id", code: "invalid" }],
      },
    };
  }

  const review = await db.BusinessReview.findByPk(id);
  if (!review) {
    return {
      error: {
        status: 404,
        message: "Review not found",
        errors: [{ code: "not_found" }],
      },
    };
  }

  if (!canMutateReview(actor, review)) {
    return {
      error: {
        status: 403,
        message: "Forbidden — you can only edit your own review",
        errors: [{ code: "forbidden" }],
      },
    };
  }

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
  if (Object.prototype.hasOwnProperty.call(body, "rating")) {
    const ratingParsed = parseRating(body.rating);
    if (ratingParsed.error) return ratingParsed;
    patch.rating = ratingParsed.value;
  }
  if (Object.prototype.hasOwnProperty.call(body, "comment")) {
    const commentParsed = parseComment(body.comment);
    if (commentParsed.error) return commentParsed;
    patch.comment = commentParsed.value;
  }

  if (Object.keys(patch).length === 0) {
    return {
      error: {
        status: 400,
        message: "Nothing to update",
        errors: [{ code: "empty_patch" }],
      },
    };
  }

  const transaction = await db.sequelize.transaction();
  try {
    await review.update(patch, { transaction });
    const aggregates = await refreshBusinessRatings(
      review.businessId,
      transaction,
    );
    await transaction.commit();

    const withAuthor = await db.BusinessReview.findByPk(review.id, {
      include: [authorInclude()],
    });

    return { review: withAuthor, aggregates };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function deleteReview(actor, reviewId) {
  const id = Number(reviewId);
  if (!Number.isInteger(id) || id < 1) {
    return {
      error: {
        status: 400,
        message: "Invalid review id",
        errors: [{ field: "id", code: "invalid" }],
      },
    };
  }

  const review = await db.BusinessReview.findByPk(id);
  if (!review) {
    return {
      error: {
        status: 404,
        message: "Review not found",
        errors: [{ code: "not_found" }],
      },
    };
  }

  if (!canMutateReview(actor, review)) {
    return {
      error: {
        status: 403,
        message: "Forbidden — you can only delete your own review",
        errors: [{ code: "forbidden" }],
      },
    };
  }

  const businessId = review.businessId;
  const transaction = await db.sequelize.transaction();
  try {
    await review.destroy({ transaction });
    const aggregates = await refreshBusinessRatings(businessId, transaction);
    await transaction.commit();
    return { businessId, aggregates };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  canMutateReview,
  toPublicReview,
  listReviewsForBusiness,
  createReview,
  updateReview,
  deleteReview,
};
