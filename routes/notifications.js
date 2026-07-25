var express = require("express");
var router = express.Router();

const { requireAuth } = require("../middleware/requireAuth");
const { attachLocalUser } = require("../middleware/attachLocalUser");
const { requireAdmin } = require("../middleware/requireAdmin");
const notificationService = require("../service/notificationService");
const { success, fail } = require("../utils/apiResponse");

function respondServiceError(res, error) {
  return fail(res, error.message, error.status || 400, error.errors || []);
}

/**
 * GET /api/v1/notifications
 * Signed-in inbox (newest first, capped).
 */
router.get(
  "/api/v1/notifications",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await notificationService.listForUser(
        req.user.id,
        req.query,
      );
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(
        res,
        {
          notifications: result.notifications.map((row) =>
            notificationService.toPublicNotification(row),
          ),
          unreadCount: result.unreadCount,
        },
        "OK",
      );
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * POST /api/v1/notifications/read-all
 * Mark all of the current user's notifications as read.
 */
router.post(
  "/api/v1/notifications/read-all",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await notificationService.markAllRead(req.user.id);
      return success(res, { updatedCount: result.updatedCount }, "OK");
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * POST /api/v1/notifications/announce
 * Admin in-app broadcast (inbox rows). Ready for v2 admin panel UI —
 * not device push. Creates one row per user (capped).
 */
router.post(
  "/api/v1/notifications/announce",
  requireAuth,
  attachLocalUser,
  requireAdmin,
  async function (req, res, next) {
    try {
      const result = await notificationService.announceToAllUsers(
        req.user,
        req.body,
      );
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(
        res,
        { createdCount: result.createdCount },
        "Created",
        201,
      );
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark one notification as read (owner only).
 */
router.patch(
  "/api/v1/notifications/:id/read",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await notificationService.markRead(
        req.user.id,
        req.params.id,
      );
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(
        res,
        {
          notification: notificationService.toPublicNotification(
            result.notification,
          ),
        },
        "OK",
      );
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
