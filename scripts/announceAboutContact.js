/**
 * One-shot: in-app inbox announcement for all users (About contact CTA).
 *
 * Usage (from backend-project-jeven-hana/):
 *   node scripts/announceAboutContact.js
 *
 * Creates admin_announcement rows. Tap opens /about in the app
 * (requires mobile build that handles targetType "about").
 */
require("dotenv").config();

const { Op } = require("sequelize");
const { db } = require("../models");

const TITLE = "رابطہ کریں";
const BODY =
  "اگر آپ کو ایپ استعمال کرتے ہوئے کسی بھی قسم کی دشواری پیش آئے یا آپ کی کوئی تجویز ہو، تو آپ ای میل یا واٹس ایپ کے ذریعے ہم سے رابطہ کر سکتے ہیں۔ آپ کی رائے ہمارے لیے نہایت اہم ہے۔";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }

  await db.sequelize.authenticate();

  const users = await db.User.findAll({
    attributes: ["id", "firstName", "lastName", "role"],
    order: [["id", "ASC"]],
    limit: 500,
  });

  if (users.length === 0) {
    console.log("No users found — nothing to announce.");
    await db.sequelize.close();
    return;
  }

  const admin =
    users.find((u) => u.role === "admin") || users[0];
  const actorName =
    [admin.firstName, admin.lastName].filter(Boolean).join(" ").trim() ||
    "Jevan Hana";

  const rows = users.map((user) => ({
    userId: user.id,
    type: "admin_announcement",
    title: TITLE,
    body: BODY,
    isRead: false,
    actorUserId: admin.id,
    actorName,
    actorAvatarUrl: null,
    targetType: "about",
    targetId: "about",
  }));

  await db.Notification.bulkCreate(rows, { validate: true });

  console.log(
    `Created ${rows.length} in-app notification(s) (targetType=about → /about).`,
  );
  await db.sequelize.close();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await db.sequelize.close();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
