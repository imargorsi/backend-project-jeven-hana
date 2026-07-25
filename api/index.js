/**
 * Vercel serverless entry — re-exports the Express app.
 * Local dev still uses `npm start` → bin/www.
 */
try {
  module.exports = require("../app");
} catch (error) {
  console.error("[vercel] Failed to load Express app:", error);
  throw error;
}
