/**
 * Fixed community post categories (v1).
 * Users pick one — no creating new categories.
 */
const COMMUNITY_POST_CATEGORIES = [
  "announcements",
  "news",
  "alerts",
  "lost-found",
  "recommendations",
  "help",
  "buy-sell",
  "talk",
];

const COMMUNITY_POST_CATEGORY_SET = new Set(COMMUNITY_POST_CATEGORIES);

function isCommunityPostCategory(value) {
  return typeof value === "string" && COMMUNITY_POST_CATEGORY_SET.has(value);
}

module.exports = {
  COMMUNITY_POST_CATEGORIES,
  isCommunityPostCategory,
};
