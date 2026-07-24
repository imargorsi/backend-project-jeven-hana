var express = require("express");
var router = express.Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireAdmin } = require("../middleware/requireAdmin");
const { attachLocalUser } = require("../middleware/attachLocalUser");
const userService = require("../service/userService");
const { success } = require("../utils/apiResponse");

/**
 * POST /api/v1/auth/sync
 * Upsert local user from Clerk (call after sign-in).
 */
router.post(
  "/api/v1/auth/sync",
  requireAuth,
  async function (req, res, next) {
    try {
      const user = await userService.syncUserFromClerk(req.clerkUserId);
      return success(res, { user: userService.toPublicUser(user) }, "User synced");
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/v1/auth/me
 * Current user profile (local DB, synced from Clerk).
 */
router.get(
  "/api/v1/auth/me",
  requireAuth,
  attachLocalUser,
  function (req, res) {
    return success(res, { user: userService.toPublicUser(req.user) }, "OK");
  }
);

/**
 * GET /api/v1/auth/ping
 * Lightweight auth check — proves Bearer token works.
 */
router.get("/api/v1/auth/ping", requireAuth, function (req, res) {
  return success(
    res,
    { clerkUserId: req.clerkUserId, authenticated: true },
    "Authenticated"
  );
});

/**
 * GET /api/v1/auth/admin-ping
 * Proves admin role guard (set publicMetadata.role = "admin" in Clerk).
 */
router.get(
  "/api/v1/auth/admin-ping",
  requireAuth,
  attachLocalUser,
  requireAdmin,
  function (req, res) {
    return success(
      res,
      { clerkUserId: req.clerkUserId, role: req.user.role },
      "Admin OK"
    );
  }
);

module.exports = router;
