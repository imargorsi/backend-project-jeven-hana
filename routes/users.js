var express = require("express");
var router = express.Router();

const { requireAuth } = require("../middleware/requireAuth");
const { attachLocalUser } = require("../middleware/attachLocalUser");
const userService = require("../service/userService");
const { success } = require("../utils/apiResponse");

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
  }
);

module.exports = router;
