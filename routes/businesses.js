var express = require("express");
var router = express.Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireAdmin } = require("../middleware/requireAdmin");
const { attachLocalUser } = require("../middleware/attachLocalUser");
const businessService = require("../service/businessService");
const {
  BUSINESS_CATEGORIES,
} = require("../constants/businessCategories");
const { success, fail } = require("../utils/apiResponse");

function respondServiceError(res, error) {
  return fail(res, error.message, error.status || 400, error.errors || []);
}

/**
 * GET /api/v1/businesses/categories
 */
router.get("/api/v1/businesses/categories", function (req, res) {
  return success(res, { categories: BUSINESS_CATEGORIES }, "OK");
});

/**
 * GET /api/v1/businesses
 * Public list. Optional ?category=&limit=&offset=
 * Default limit 20, max 50.
 */
router.get("/api/v1/businesses", async function (req, res, next) {
  try {
    const result = await businessService.listBusinesses({
      category: req.query.category || undefined,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    if (result.error) {
      return respondServiceError(res, result.error);
    }

    return success(
      res,
      {
        businesses: result.businesses.map(businessService.toPublicBusiness),
        meta: result.meta,
      },
      "OK",
    );
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/v1/businesses
 */
router.post(
  "/api/v1/businesses",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await businessService.createBusiness(
        req.user.id,
        req.body,
      );
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(
        res,
        { business: businessService.toPublicBusiness(result.business) },
        "Created",
        201,
      );
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * GET /api/v1/businesses/me
 * Optional ?limit=&offset= (default 50, max 100).
 */
router.get(
  "/api/v1/businesses/me",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await businessService.listBusinessesForUser(req.user.id, {
        limit: req.query.limit,
        offset: req.query.offset,
      });
      return success(
        res,
        {
          businesses: result.businesses.map(businessService.toPublicBusiness),
          meta: result.meta,
        },
        "OK",
      );
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * GET /api/v1/businesses/:id
 */
router.get("/api/v1/businesses/:id", async function (req, res, next) {
  try {
    const business = await businessService.getBusinessById(req.params.id);
    if (!business) {
      return fail(res, "Business not found", 404, [{ code: "not_found" }]);
    }

    return success(
      res,
      { business: businessService.toPublicBusiness(business) },
      "OK",
    );
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/v1/businesses/:id
 */
router.patch(
  "/api/v1/businesses/:id",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await businessService.updateBusiness(
        req.user,
        req.params.id,
        req.body,
      );
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(
        res,
        { business: businessService.toPublicBusiness(result.business) },
        "Updated",
      );
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * DELETE /api/v1/businesses/:id
 */
router.delete(
  "/api/v1/businesses/:id",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await businessService.deleteBusiness(
        req.user,
        req.params.id,
      );
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(res, { business: result.business }, "Deleted");
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * POST /api/v1/businesses/:id/featured
 * Admin toggle Featured (verified icon on listings).
 */
router.post(
  "/api/v1/businesses/:id/featured",
  requireAuth,
  attachLocalUser,
  requireAdmin,
  async function (req, res, next) {
    try {
      const result = await businessService.toggleFeatured(req.params.id);
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(
        res,
        { business: businessService.toPublicBusiness(result.business) },
        result.business.isFeatured ? "Marked Featured" : "Removed Featured",
      );
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
