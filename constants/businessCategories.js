/**
 * Fixed Explore / business listing categories (v1).
 * Combined shops + places — users pick one; no creating new categories.
 */
const BUSINESS_CATEGORIES = ["food", "masjid", "shops", "parks"];

const BUSINESS_CATEGORY_SET = new Set(BUSINESS_CATEGORIES);

function isBusinessCategory(value) {
  return typeof value === "string" && BUSINESS_CATEGORY_SET.has(value);
}

module.exports = {
  BUSINESS_CATEGORIES,
  isBusinessCategory,
};
