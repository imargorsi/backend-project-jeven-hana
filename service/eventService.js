const { Op } = require("sequelize");
const { db } = require("../models");

function toPublicEvent(event, { isGoingByMe = false } = {}) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location: event.location,
    interestedCount: event.interestedCount,
    isGoingByMe: Boolean(isGoingByMe),
    createdByUserId: event.createdByUserId,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function isAdmin(user) {
  return Boolean(user && user.role === "admin");
}

/** Owner or admin may edit/delete. */
function canMutateEvent(user, event) {
  if (!user || !event) return false;
  if (isAdmin(user)) return true;
  return event.createdByUserId === user.id;
}

function trimOrNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseDate(value, field) {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      error: {
        status: 400,
        message: `\`${field}\` must be a valid date`,
        errors: [{ field, code: "invalid_date" }],
      },
    };
  }
  return { value: date };
}

/**
 * Validate create body — title, location, startsAt required.
 * Optional: description, endsAt.
 */
function parseCreateInput(body) {
  if (!body || typeof body !== "object") {
    return {
      error: {
        status: 400,
        message: "Request body is required",
        errors: [{ code: "invalid_body" }],
      },
    };
  }

  const title = trimOrNull(body.title);
  if (!title) {
    return {
      error: {
        status: 400,
        message: "`title` is required",
        errors: [{ field: "title", code: "required" }],
      },
    };
  }

  const location = trimOrNull(body.location);
  if (!location) {
    return {
      error: {
        status: 400,
        message: "`location` is required",
        errors: [{ field: "location", code: "required" }],
      },
    };
  }

  if (body.startsAt === undefined || body.startsAt === null || body.startsAt === "") {
    return {
      error: {
        status: 400,
        message: "`startsAt` is required",
        errors: [{ field: "startsAt", code: "required" }],
      },
    };
  }

  const startsAtParsed = parseDate(body.startsAt, "startsAt");
  if (startsAtParsed.error) return startsAtParsed;

  let endsAt = null;
  if (body.endsAt !== undefined && body.endsAt !== null && body.endsAt !== "") {
    const endsAtParsed = parseDate(body.endsAt, "endsAt");
    if (endsAtParsed.error) return endsAtParsed;
    endsAt = endsAtParsed.value;
    if (endsAt.getTime() < startsAtParsed.value.getTime()) {
      return {
        error: {
          status: 400,
          message: "`endsAt` must be on or after `startsAt`",
          errors: [{ field: "endsAt", code: "invalid_range" }],
        },
      };
    }
  }

  const description =
    body.description === undefined || body.description === null
      ? null
      : trimOrNull(String(body.description));

  return {
    data: {
      title,
      location,
      startsAt: startsAtParsed.value,
      endsAt,
      description,
    },
  };
}

/**
 * Validate PATCH body — only provided slim fields.
 * Empty object → validation error.
 */
function parseUpdateInput(body) {
  if (!body || typeof body !== "object") {
    return {
      error: {
        status: 400,
        message: "Request body is required",
        errors: [{ code: "invalid_body" }],
      },
    };
  }

  const patch = {};

  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    const title = trimOrNull(body.title);
    if (!title) {
      return {
        error: {
          status: 400,
          message: "`title` cannot be empty",
          errors: [{ field: "title", code: "required" }],
        },
      };
    }
    patch.title = title;
  }

  if (Object.prototype.hasOwnProperty.call(body, "location")) {
    const location = trimOrNull(body.location);
    if (!location) {
      return {
        error: {
          status: 400,
          message: "`location` cannot be empty",
          errors: [{ field: "location", code: "required" }],
        },
      };
    }
    patch.location = location;
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    patch.description =
      body.description === null ? null : trimOrNull(String(body.description));
  }

  if (Object.prototype.hasOwnProperty.call(body, "startsAt")) {
    if (body.startsAt === null || body.startsAt === "") {
      return {
        error: {
          status: 400,
          message: "`startsAt` cannot be empty",
          errors: [{ field: "startsAt", code: "required" }],
        },
      };
    }
    const startsAtParsed = parseDate(body.startsAt, "startsAt");
    if (startsAtParsed.error) return startsAtParsed;
    patch.startsAt = startsAtParsed.value;
  }

  if (Object.prototype.hasOwnProperty.call(body, "endsAt")) {
    if (body.endsAt === null || body.endsAt === "") {
      patch.endsAt = null;
    } else {
      const endsAtParsed = parseDate(body.endsAt, "endsAt");
      if (endsAtParsed.error) return endsAtParsed;
      patch.endsAt = endsAtParsed.value;
    }
  }

  if (Object.keys(patch).length === 0) {
    return {
      error: {
        status: 400,
        message: "No updatable fields provided",
        errors: [{ code: "empty_patch" }],
      },
    };
  }

  return { data: patch };
}

function assertEndsAfterStarts(startsAt, endsAt) {
  if (!endsAt) return null;
  if (endsAt.getTime() < startsAt.getTime()) {
    return {
      error: {
        status: 400,
        message: "`endsAt` must be on or after `startsAt`",
        errors: [{ field: "endsAt", code: "invalid_range" }],
      },
    };
  }
  return null;
}

async function listUpcomingEvents() {
  const now = new Date();
  return db.Event.findAll({
    where: {
      startsAt: {
        [Op.gte]: now,
      },
    },
    order: [["startsAt", "ASC"]],
  });
}

async function getEventById(id) {
  return db.Event.findByPk(id);
}

async function listGoingEventsForUser(userId) {
  const rows = await db.EventGoing.findAll({
    where: { userId },
    include: [
      {
        model: db.Event,
        as: "event",
        required: true,
      },
    ],
  });

  return rows
    .map((row) => row.event)
    .filter(Boolean)
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
}

/**
 * Toggle Going for a user. Updates denormalized interestedCount.
 * @returns {{ event, isGoingByMe } | null}
 */
async function toggleGoing(userId, eventId) {
  const event = await getEventById(eventId);
  if (!event) return null;

  const existing = await db.EventGoing.findOne({
    where: { userId, eventId },
  });

  if (existing) {
    await existing.destroy();
    const nextCount = Math.max(0, event.interestedCount - 1);
    await event.update({ interestedCount: nextCount });
    await event.reload();
    return { event, isGoingByMe: false };
  }

  await db.EventGoing.create({ userId, eventId });
  await event.update({ interestedCount: event.interestedCount + 1 });
  await event.reload();
  return { event, isGoingByMe: true };
}

/**
 * Create event for signed-in user (live immediately — no approval).
 * @returns {{ event } | { error }}
 */
async function createEvent(userId, body) {
  const parsed = parseCreateInput(body);
  if (parsed.error) return { error: parsed.error };

  const event = await db.Event.create({
    ...parsed.data,
    createdByUserId: userId,
    interestedCount: 0,
  });

  return { event };
}

/**
 * Update event — owner or admin.
 * @returns {{ event } | { error }}
 */
async function updateEvent(actor, eventId, body) {
  const event = await getEventById(eventId);
  if (!event) {
    return {
      error: {
        status: 404,
        message: "Event not found",
        errors: [{ code: "not_found" }],
      },
    };
  }

  if (!canMutateEvent(actor, event)) {
    return {
      error: {
        status: 403,
        message: "Forbidden — you can only edit your own events",
        errors: [{ code: "forbidden" }],
      },
    };
  }

  const parsed = parseUpdateInput(body);
  if (parsed.error) return { error: parsed.error };

  const nextStartsAt = parsed.data.startsAt ?? event.startsAt;
  const nextEndsAt =
    Object.prototype.hasOwnProperty.call(parsed.data, "endsAt")
      ? parsed.data.endsAt
      : event.endsAt;

  const rangeError = assertEndsAfterStarts(
    new Date(nextStartsAt),
    nextEndsAt ? new Date(nextEndsAt) : null,
  );
  if (rangeError) return rangeError;

  await event.update(parsed.data);
  await event.reload();
  return { event };
}

/**
 * Delete event — owner or admin. Clears Going rows first.
 * @returns {{ event } | { error }}
 */
async function deleteEvent(actor, eventId) {
  const event = await getEventById(eventId);
  if (!event) {
    return {
      error: {
        status: 404,
        message: "Event not found",
        errors: [{ code: "not_found" }],
      },
    };
  }

  if (!canMutateEvent(actor, event)) {
    return {
      error: {
        status: 403,
        message: "Forbidden — you can only delete your own events",
        errors: [{ code: "forbidden" }],
      },
    };
  }

  const snapshot = toPublicEvent(event);
  await db.EventGoing.destroy({ where: { eventId: event.id } });
  await event.destroy();
  return { event: snapshot };
}

module.exports = {
  toPublicEvent,
  canMutateEvent,
  listUpcomingEvents,
  getEventById,
  listGoingEventsForUser,
  toggleGoing,
  createEvent,
  updateEvent,
  deleteEvent,
};
