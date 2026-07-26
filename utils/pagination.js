/**
 * Shared list pagination for public feeds.
 * Always capped — never return unbounded findAll results.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
/** Safer cap for "my" lists (profile) which stay small but must not grow unbounded. */
const MAX_ME_LIMIT = 100;
const DEFAULT_ME_LIMIT = 50;

/**
 * @param {Record<string, unknown>} query
 * @param {{ defaultLimit?: number, maxLimit?: number }} [opts]
 * @returns {{ limit: number, offset: number }}
 */
function parseLimitOffset(query = {}, opts = {}) {
  const defaultLimit = opts.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = opts.maxLimit ?? MAX_LIMIT;

  const rawLimit = Number(query.limit);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), maxLimit)
    : defaultLimit;

  const rawOffset = Number(query.offset);
  const offset =
    Number.isFinite(rawOffset) && rawOffset > 0 ? Math.trunc(rawOffset) : 0;

  return { limit, offset };
}

/**
 * Fetch limit+1 rows, trim to `limit`, expose hasMore / nextOffset.
 * @param {unknown[]} rows
 * @param {{ limit: number, offset: number }} page
 */
function trimPage(rows, { limit, offset }) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    meta: {
      limit,
      offset,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    },
  };
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_ME_LIMIT,
  DEFAULT_ME_LIMIT,
  parseLimitOffset,
  trimPage,
};
