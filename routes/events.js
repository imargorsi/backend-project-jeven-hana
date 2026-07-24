var express = require("express");
var router = express.Router();

const { getAuth } = require("@clerk/express");
const { requireAuth } = require("../middleware/requireAuth");
const { attachLocalUser } = require("../middleware/attachLocalUser");
const eventService = require("../service/eventService");
const { db } = require("../models");
const { success, fail } = require("../utils/apiResponse");

async function goingSetForClerkUser(clerkUserId, eventIds) {
  if (!clerkUserId || !eventIds.length) return new Set();

  const user = await db.User.findOne({ where: { clerkId: clerkUserId } });
  if (!user) return new Set();

  const rows = await db.EventGoing.findAll({
    where: {
      userId: user.id,
      eventId: eventIds,
    },
    attributes: ["eventId"],
  });

  return new Set(rows.map((row) => row.eventId));
}

function respondServiceError(res, error) {
  return fail(res, error.message, error.status || 400, error.errors || []);
}

/**
 * GET /api/v1/events
 * Public upcoming list. If Bearer token present, marks isGoingByMe.
 */
router.get("/api/v1/events", async function (req, res, next) {
  try {
    const events = await eventService.listUpcomingEvents();
    const auth = getAuth(req);
    const going = await goingSetForClerkUser(
      auth?.userId,
      events.map((event) => event.id),
    );

    return success(
      res,
      {
        events: events.map((event) =>
          eventService.toPublicEvent(event, {
            isGoingByMe: going.has(event.id),
          }),
        ),
      },
      "OK",
    );
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/v1/events
 * Signed-in create (live immediately — no approval).
 */
router.post(
  "/api/v1/events",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await eventService.createEvent(req.user.id, req.body);
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(
        res,
        {
          event: eventService.toPublicEvent(result.event, {
            isGoingByMe: false,
          }),
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
 * GET /api/v1/events/going/me
 * Signed-in user's Going list. Registered before :id.
 */
router.get(
  "/api/v1/events/going/me",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const events = await eventService.listGoingEventsForUser(req.user.id);
      return success(
        res,
        {
          events: events.map((event) =>
            eventService.toPublicEvent(event, { isGoingByMe: true }),
          ),
        },
        "OK",
      );
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * GET /api/v1/events/:id
 * Public single event.
 */
router.get("/api/v1/events/:id", async function (req, res, next) {
  try {
    const event = await eventService.getEventById(req.params.id);
    if (!event) {
      return fail(res, "Event not found", 404, [{ code: "not_found" }]);
    }

    const auth = getAuth(req);
    const going = await goingSetForClerkUser(auth?.userId, [event.id]);

    return success(
      res,
      {
        event: eventService.toPublicEvent(event, {
          isGoingByMe: going.has(event.id),
        }),
      },
      "OK",
    );
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/v1/events/:id
 * Owner or admin edit (slim fields only).
 */
router.patch(
  "/api/v1/events/:id",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await eventService.updateEvent(
        req.user,
        req.params.id,
        req.body,
      );
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      const auth = getAuth(req);
      const going = await goingSetForClerkUser(auth?.userId, [result.event.id]);

      return success(
        res,
        {
          event: eventService.toPublicEvent(result.event, {
            isGoingByMe: going.has(result.event.id),
          }),
        },
        "Updated",
      );
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * DELETE /api/v1/events/:id
 * Owner or admin delete.
 */
router.delete(
  "/api/v1/events/:id",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await eventService.deleteEvent(req.user, req.params.id);
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(res, { event: result.event }, "Deleted");
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * POST /api/v1/events/:id/going
 * Toggle Going for the signed-in user.
 */
router.post(
  "/api/v1/events/:id/going",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await eventService.toggleGoing(req.user.id, req.params.id);
      if (!result) {
        return fail(res, "Event not found", 404, [{ code: "not_found" }]);
      }

      return success(
        res,
        {
          event: eventService.toPublicEvent(result.event, {
            isGoingByMe: result.isGoingByMe,
          }),
        },
        result.isGoingByMe ? "Marked Going" : "Removed Going",
      );
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
