var express = require("express");
var router = express.Router();

const { requireAuth } = require("../middleware/requireAuth");
const { attachLocalUser } = require("../middleware/attachLocalUser");
const r2StorageService = require("../service/r2StorageService");
const { success, fail } = require("../utils/apiResponse");

function respondServiceError(res, error) {
  return fail(res, error.message, error.status || 400, error.errors || []);
}

/**
 * GET /api/v1/uploads/status
 * Public — mobile can check whether cover upload is available.
 */
router.get("/api/v1/uploads/status", function (req, res) {
  return success(res, r2StorageService.getStorageStatus(), "OK");
});

/**
 * POST /api/v1/uploads/presign
 * Signed-in — returns a short-lived PUT URL for R2.
 * Until R2_* env keys are set, responds 503 (app keeps logo fallback).
 * When configured: returns a short-lived PUT URL for R2 cover uploads.
 */
router.post(
  "/api/v1/uploads/presign",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = await r2StorageService.createPresignedUpload({
        userId: req.user.id,
        folder: body.folder || "businesses/covers",
        contentType: body.contentType || "image/jpeg",
        filename: body.filename || "cover.jpg",
      });

      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(res, result.data, "Presigned upload ready");
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
