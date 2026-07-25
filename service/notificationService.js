const { Op } = require("sequelize");

const { db } = require("../models");

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

function displayName(user) {
  if (!user) return "Neighbour";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || "Neighbour";
}

/**
 * Public DTO for mobile (string ids).
 */
function toPublicNotification(row) {
  return {
    id: String(row.id),
    type: row.type,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt,
    isRead: Boolean(row.isRead),
    actorName: row.actorName || undefined,
    actorAvatarUrl: row.actorAvatarUrl || null,
    targetType: row.targetType || undefined,
    targetId: row.targetId ? String(row.targetId) : undefined,
  };
}

/**
 * Insert one in-app notification. Fire-and-forget safe from other services.
 * Skips when recipient is missing or same as actor (no self-notify).
 *
 * @returns {{ notification } | { skipped: true } | { error }}
 */
async function notifyUser({
  userId,
  type,
  title,
  body,
  actorUserId = null,
  actorName = null,
  actorAvatarUrl = null,
  targetType = null,
  targetId = null,
  transaction = null,
}) {
  if (userId == null) {
    return { skipped: true };
  }
  if (actorUserId != null && Number(actorUserId) === Number(userId)) {
    return { skipped: true };
  }

  const notification = await db.Notification.create(
    {
      userId: Number(userId),
      type,
      title,
      body,
      isRead: false,
      actorUserId: actorUserId != null ? Number(actorUserId) : null,
      actorName,
      actorAvatarUrl,
      targetType,
      targetId: targetId != null ? String(targetId) : null,
    },
    transaction ? { transaction } : undefined,
  );

  return { notification };
}

/**
 * @returns {{ notifications, unreadCount } | { error }}
 */
async function listForUser(userId, query = {}) {
  const rawLimit = Number(query.limit);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const notifications = await db.Notification.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit,
  });

  const unreadCount = await db.Notification.count({
    where: { userId, isRead: false },
  });

  return { notifications, unreadCount };
}

/**
 * @returns {{ notification } | { error }}
 */
async function markRead(userId, notificationId) {
  const id = Number(notificationId);
  if (!Number.isFinite(id)) {
    return {
      error: { status: 400, message: "Invalid notification id", errors: [] },
    };
  }

  const notification = await db.Notification.findByPk(id);
  if (!notification || notification.userId !== userId) {
    return {
      error: { status: 404, message: "Notification not found", errors: [] },
    };
  }

  if (!notification.isRead) {
    await notification.update({ isRead: true });
  }

  return { notification };
}

/**
 * @returns {{ updatedCount }}
 */
async function markAllRead(userId) {
  const [updatedCount] = await db.Notification.update(
    { isRead: true },
    { where: { userId, isRead: false } },
  );
  return { updatedCount };
}

/**
 * Admin broadcast — creates in-app inbox rows for users.
 * API surface for the future admin panel (v2). Not device push / FCM.
 * Cap protects accidental mass writes on a small-town user base.
 *
 * @returns {{ createdCount } | { error }}
 */
async function announceToAllUsers(adminUser, body) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const message = typeof body?.body === "string" ? body.body.trim() : "";

  if (!title || !message) {
    return {
      error: {
        status: 400,
        message: "Title and body are required",
        errors: [],
      },
    };
  }

  const users = await db.User.findAll({
    attributes: ["id"],
    where: { id: { [Op.ne]: adminUser.id } },
    limit: 500,
  });

  if (users.length === 0) {
    return { createdCount: 0 };
  }

  const rows = users.map((user) => ({
    userId: user.id,
    type: "admin_announcement",
    title,
    body: message,
    isRead: false,
    actorUserId: adminUser.id,
    actorName: displayName(adminUser),
    actorAvatarUrl: adminUser.imageUrl || null,
    targetType: body?.targetType || null,
    targetId: body?.targetId != null ? String(body.targetId) : null,
  }));

  await db.Notification.bulkCreate(rows);
  return { createdCount: rows.length };
}

module.exports = {
  displayName,
  toPublicNotification,
  notifyUser,
  listForUser,
  markRead,
  markAllRead,
  announceToAllUsers,
};
