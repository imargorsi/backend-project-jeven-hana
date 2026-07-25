var express = require("express");
var router = express.Router();

const { requireAuth } = require("../middleware/requireAuth");
const { attachLocalUser } = require("../middleware/attachLocalUser");
const userService = require("../service/userService");
const { success, fail } = require("../utils/apiResponse");

/**
 * GET /api/v1/users/me
 * Current local user (synced from Clerk). Same payload as /api/v1/auth/me.
 */
router.get(
  "/api/v1/users/me",
  requireAuth,
  attachLocalUser,
  function (req, res) {
    return success(res, { user: userService.toPublicUser(req.user) }, "OK");
  },
);

/**
 * DELETE /api/v1/users/me
 * Permanently delete the signed-in account (Neon content + Clerk user).
 * Body: { "confirm": "DELETE" }
 */
router.delete(
  "/api/v1/users/me",
  requireAuth,
  async function (req, res, next) {
    try {
      const confirm =
        req.body && typeof req.body === "object" ? req.body.confirm : undefined;
      const result = await userService.deleteAccountForClerkUser(
        req.clerkUserId,
        confirm,
      );

      if (result.error) {
        return fail(
          res,
          result.error.message,
          result.error.status,
          result.error.errors || [],
        );
      }

      return success(res, result.data, "Account deleted");
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
