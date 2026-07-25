const { db } = require("../models");
const notificationService = require("./notificationService");

const TARGET_TYPES = new Set(["post", "business", "event"]);
const REASONS = new Set([
  "spam",
  "harassment",
  "misinformation",
  "inappropriate",
  "illegal",
  "other",
]);

let tableReady = false;

async function ensureReportsTable() {
  if (tableReady) return;
  await db.Report.sync();
  tableReady = true;
}

function toPublicReport(row) {
  return {
    id: String(row.id),
    targetType: row.targetType,
    targetId: String(row.targetId),
    reason: row.reason,
    details: row.details || null,
    status: row.status,
    reporterUserId: row.reporterUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function targetExists(targetType, targetId) {
  const id = Number(targetId);
  if (!Number.isFinite(id) || id <= 0) {
    return false;
  }

  if (targetType === "post") {
    return Boolean(await db.CommunityPost.findByPk(id));
  }
  if (targetType === "business") {
    return Boolean(await db.Business.findByPk(id));
  }
  if (targetType === "event") {
    return Boolean(await db.Event.findByPk(id));
  }
  return false;
}

/**
 * Create a content report. Notifies all local admins.
 */
async function createReport(actor, body = {}) {
  await ensureReportsTable();

  const targetType = String(body.targetType || "").trim();
  const targetId = String(body.targetId || "").trim();
  const reason = String(body.reason || "").trim();
  const details =
    body.details != null ? String(body.details).trim().slice(0, 1000) : null;

  if (!TARGET_TYPES.has(targetType)) {
    return {
      error: {
        status: 400,
        message: "Invalid targetType",
        errors: [{ field: "targetType" }],
      },
    };
  }
  if (!targetId) {
    return {
      error: {
        status: 400,
        message: "targetId is required",
        errors: [{ field: "targetId" }],
      },
    };
  }
  if (!REASONS.has(reason)) {
    return {
      error: {
        status: 400,
        message: "Invalid reason",
        errors: [{ field: "reason" }],
      },
    };
  }

  const exists = await targetExists(targetType, targetId);
  if (!exists) {
    return {
      error: {
        status: 404,
        message: "Content not found",
        errors: [{ code: "not_found" }],
      },
    };
  }

  const recent = await db.Report.findOne({
    where: {
      reporterUserId: actor.id,
      targetType,
      targetId,
      status: "open",
    },
    order: [["createdAt", "DESC"]],
  });

  if (recent) {
    const ageMs = Date.now() - new Date(recent.createdAt).getTime();
    if (ageMs < 60 * 60 * 1000) {
      return {
        error: {
          status: 429,
          message: "You already reported this recently. Thanks for helping.",
          errors: [{ code: "duplicate_report" }],
        },
      };
    }
  }

  const report = await db.Report.create({
    reporterUserId: actor.id,
    targetType,
    targetId,
    reason,
    details: details || null,
    status: "open",
  });

  const admins = await db.User.findAll({
    where: { role: "admin" },
    attributes: ["id"],
  });

  const actorName = [actor.firstName, actor.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  await Promise.all(
    admins.map((admin) =>
      notificationService.notifyUser({
        userId: admin.id,
        type: "moderation_update",
        title: "New content report",
        body: `A ${targetType} was reported for ${reason}.`,
        actorUserId: actor.id,
        actorName: actorName || "Neighbour",
        actorAvatarUrl: actor.imageUrl || null,
        targetType,
        targetId,
      }),
    ),
  );

  return { data: { report: toPublicReport(report) } };
}

/**
 * Admin list of open/recent reports.
 */
async function listReports(query = {}) {
  await ensureReportsTable();

  const status = query.status ? String(query.status) : "open";
  const where = {};
  if (status !== "all") {
    where.status = status;
  }

  const rows = await db.Report.findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: 50,
  });

  return {
    data: {
      reports: rows.map(toPublicReport),
    },
  };
}

module.exports = {
  TARGET_TYPES,
  REASONS,
  createReport,
  listReports,
  toPublicReport,
};
