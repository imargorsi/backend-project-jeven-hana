var express = require("express");
var router = express.Router();

const { requireAuth } = require("../middleware/requireAuth");
const { attachLocalUser } = require("../middleware/attachLocalUser");
const { requireAdmin } = require("../middleware/requireAdmin");
const reportService = require("../service/reportService");
const { success, fail } = require("../utils/apiResponse");

function respondServiceError(res, error) {
  return fail(res, error.message, error.status || 400, error.errors || []);
}

/**
 * POST /api/v1/reports
 * Signed-in — report a post, business, or event.
 * Body: { targetType, targetId, reason, details? }
 */
router.post(
  "/api/v1/reports",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await reportService.createReport(req.user, req.body || {});
      if (result.error) {
        return respondServiceError(res, result.error);
      }
      return success(res, result.data, "Report submitted", 201);
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * GET /api/v1/reports
 * Admin — list reports (default open).
 */
router.get(
  "/api/v1/reports",
  requireAuth,
  attachLocalUser,
  requireAdmin,
  async function (req, res, next) {
    try {
      const result = await reportService.listReports(req.query || {});
      if (result.error) {
        return respondServiceError(res, result.error);
      }
      return success(res, result.data, "OK");
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
