var express = require("express");
var router = express.Router();
var { getAuth } = require("@clerk/express");

const searchService = require("../service/searchService");
const { success, fail } = require("../utils/apiResponse");

function respondServiceError(res, error) {
  return fail(res, error.message, error.status || 400, error.errors || []);
}

/**
 * GET /api/v1/search/trending
 * Public — top 5 featured businesses (for idle trending chips).
 */
router.get("/api/v1/search/trending", async function (req, res, next) {
  try {
    const result = await searchService.listTrendingFeatured();
    return success(res, { businesses: result.businesses }, "OK");
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/v1/search?q=&type=all|businesses|community|events
 * Public unified search. Optional Bearer enriches like / Going flags.
 */
router.get("/api/v1/search", async function (req, res, next) {
  try {
    const auth = getAuth(req);
    const result = await searchService.search({
      q: req.query.q,
      type: req.query.type || "all",
      clerkUserId: auth?.userId || null,
    });
    if (result.error) {
      return respondServiceError(res, result.error);
    }

    return success(
      res,
      {
        query: result.query,
        type: result.type,
        businesses: result.businesses,
        posts: result.posts,
        events: result.events,
      },
      "OK",
    );
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
