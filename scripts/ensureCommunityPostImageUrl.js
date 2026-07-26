/**
 * Ensure CommunityPosts.imageUrl exists on Neon (Vercel does not run sync alter).
 *
 * Usage: node scripts/ensureCommunityPostImageUrl.js
 */
require("dotenv").config();

const database = require("../bin/dbConnection");

const SQL = `
ALTER TABLE "CommunityPosts"
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT
`;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }

  await database.query(SQL);
  console.log('CommunityPosts.imageUrl ensured.');
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
