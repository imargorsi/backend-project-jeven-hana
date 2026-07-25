var express = require("express");
var router = express.Router();

const { requireAuth } = require("../middleware/requireAuth");
const { attachLocalUser } = require("../middleware/attachLocalUser");
const reviewService = require("../service/reviewService");
const { success, fail } = require("../utils/apiResponse");

function respondServiceError(res, error) {
  return fail(res, error.message, error.status || 400, error.errors || []);
}

/**
 * GET /api/v1/businesses/:id/reviews
 * Public list for a listing.
 */
router.get("/api/v1/businesses/:id/reviews", async function (req, res, next) {
  try {
    const result = await reviewService.listReviewsForBusiness(req.params.id);
    if (result.error) {
      return respondServiceError(res, result.error);
    }

    return success(
      res,
      {
        reviews: result.reviews.map((review) =>
          reviewService.toPublicReview(review),
        ),
      },
      "OK",
    );
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/v1/businesses/:id/reviews
 * Signed-in create (one review per user per business).
 */
router.post(
  "/api/v1/businesses/:id/reviews",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await reviewService.createReview(
        req.user,
        req.params.id,
        req.body,
      );
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(
        res,
        {
          review: reviewService.toPublicReview(result.review),
          ratingAvg: result.aggregates.ratingAvg,
          reviewCount: result.aggregates.reviewCount,
        },
        "Created",
        201,
      );
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * PATCH /api/v1/reviews/:id
 * Owner or admin edit.
 */
router.patch(
  "/api/v1/reviews/:id",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await reviewService.updateReview(
        req.user,
        req.params.id,
        req.body,
      );
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(
        res,
        {
          review: reviewService.toPublicReview(result.review),
          ratingAvg: result.aggregates.ratingAvg,
          reviewCount: result.aggregates.reviewCount,
        },
        "Updated",
      );
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * DELETE /api/v1/reviews/:id
 * Owner or admin delete.
 */
router.delete(
  "/api/v1/reviews/:id",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await reviewService.deleteReview(req.user, req.params.id);
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(
        res,
        {
          businessId: result.businessId,
          ratingAvg: result.aggregates.ratingAvg,
          reviewCount: result.aggregates.reviewCount,
        },
        "Deleted",
      );
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
