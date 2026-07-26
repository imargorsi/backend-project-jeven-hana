/**
 * Idempotent Neon index ensure for list / feed access patterns.
 * Safe to re-run. Uses CREATE INDEX IF NOT EXISTS (non-concurrent).
 *
 * Usage (from backend-project-jeven-hana/):
 *   node scripts/ensureListIndexes.js
 */
require("dotenv").config();

const database = require("../bin/dbConnection");

const STATEMENTS = [
  `CREATE INDEX IF NOT EXISTS "businesses_is_featured_name"
    ON "Businesses" ("isFeatured" DESC, "name" ASC)`,
  `CREATE INDEX IF NOT EXISTS "businesses_category_is_featured_name"
    ON "Businesses" ("category", "isFeatured" DESC, "name" ASC)`,
  `CREATE INDEX IF NOT EXISTS "community_posts_category_is_pinned_created_at"
    ON "CommunityPosts" ("category", "isPinned" DESC, "createdAt" DESC)`,
  `CREATE INDEX IF NOT EXISTS "community_post_likes_user_id_post_id"
    ON "CommunityPostLikes" ("userId", "postId")`,
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }

  for (const sql of STATEMENTS) {
    process.stdout.write(`→ ${sql.split("\n")[0].trim()}… `);
    await database.query(sql);
    console.log("ok");
  }

  console.log("List indexes ensured.");
  await database.close();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await database.close();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
