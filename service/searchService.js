const { Op } = require("sequelize");

const { db } = require("../models");
const businessService = require("./businessService");
const communityService = require("./communityService");
const eventService = require("./eventService");

const SEARCH_TYPES = ["all", "businesses", "community", "events"];
const PER_TYPE_LIMIT = 20;
const TRENDING_LIMIT = 5;

const BUSINESS_LIST_ATTRIBUTES = [
  "id",
  "name",
  "category",
  "description",
  "address",
  "phone",
  "whatsapp",
  "coverImageUrl",
  "isFeatured",
  "ratingAvg",
  "reviewCount",
  "createdByUserId",
  "createdAt",
  "updatedAt",
];

const POST_LIST_ATTRIBUTES = [
  "id",
  "content",
  "contentIsUrdu",
  "category",
  "isPinned",
  "likeCount",
  "createdByUserId",
  "createdAt",
  "updatedAt",
];

const EVENT_LIST_ATTRIBUTES = [
  "id",
  "title",
  "description",
  "startsAt",
  "endsAt",
  "location",
  "interestedCount",
  "createdByUserId",
  "createdAt",
  "updatedAt",
];

function normalizeType(raw) {
  const type = typeof raw === "string" ? raw.trim().toLowerCase() : "all";
  if (!SEARCH_TYPES.includes(type)) {
    return {
      error: {
        status: 400,
        message: `\`type\` must be one of: ${SEARCH_TYPES.join(", ")}`,
        errors: [{ field: "type", code: "invalid" }],
      },
    };
  }
  return { value: type };
}

function authorInclude() {
  return {
    model: db.User,
    as: "author",
    attributes: ["id", "firstName", "lastName", "imageUrl", "role"],
  };
}

async function searchBusinesses(q) {
  return db.Business.findAll({
    where: {
      [Op.or]: [
        { name: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
        { address: { [Op.iLike]: `%${q}%` } },
      ],
    },
    attributes: BUSINESS_LIST_ATTRIBUTES,
    order: [
      ["isFeatured", "DESC"],
      ["ratingAvg", "DESC"],
      ["name", "ASC"],
    ],
    limit: PER_TYPE_LIMIT,
  });
}

async function searchPosts(q) {
  return db.CommunityPost.findAll({
    where: {
      content: { [Op.iLike]: `%${q}%` },
    },
    attributes: POST_LIST_ATTRIBUTES,
    include: [authorInclude()],
    order: [
      ["isPinned", "DESC"],
      ["createdAt", "DESC"],
    ],
    limit: PER_TYPE_LIMIT,
  });
}

async function searchEvents(q) {
  return db.Event.findAll({
    where: {
      [Op.or]: [
        { title: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
        { location: { [Op.iLike]: `%${q}%` } },
      ],
    },
    attributes: EVENT_LIST_ATTRIBUTES,
    order: [["startsAt", "DESC"]],
    limit: PER_TYPE_LIMIT,
  });
}

async function likedPostIdSet(userId, postIds) {
  if (!userId || !postIds.length) return new Set();
  const rows = await db.CommunityPostLike.findAll({
    where: { userId, postId: { [Op.in]: postIds } },
    attributes: ["postId"],
  });
  return new Set(rows.map((row) => row.postId));
}

async function goingEventIdSet(userId, eventIds) {
  if (!userId || !eventIds.length) return new Set();
  const rows = await db.EventGoing.findAll({
    where: { userId, eventId: { [Op.in]: eventIds } },
    attributes: ["eventId"],
  });
  return new Set(rows.map((row) => row.eventId));
}

async function resolveLocalUserId(clerkUserId) {
  if (!clerkUserId) return null;
  const user = await db.User.findOne({
    where: { clerkId: clerkUserId },
    attributes: ["id"],
  });
  return user?.id ?? null;
}

/**
 * Public unified search (no places — folded into businesses).
 * @returns {{ query, type, businesses, posts, events } | { error }}
 */
async function search({ q, type: typeRaw, clerkUserId = null }) {
  const query = typeof q === "string" ? q.trim() : "";
  if (!query) {
    return {
      error: {
        status: 400,
        message: "`q` is required",
        errors: [{ field: "q", code: "required" }],
      },
    };
  }

  const typeParsed = normalizeType(typeRaw);
  if (typeParsed.error) return typeParsed;
  const type = typeParsed.value;

  const wantBusinesses = type === "all" || type === "businesses";
  const wantCommunity = type === "all" || type === "community";
  const wantEvents = type === "all" || type === "events";

  const [businesses, posts, events, localUserId] = await Promise.all([
    wantBusinesses ? searchBusinesses(query) : Promise.resolve([]),
    wantCommunity ? searchPosts(query) : Promise.resolve([]),
    wantEvents ? searchEvents(query) : Promise.resolve([]),
    resolveLocalUserId(clerkUserId),
  ]);

  const [liked, going] = await Promise.all([
    likedPostIdSet(
      localUserId,
      posts.map((post) => post.id),
    ),
    goingEventIdSet(
      localUserId,
      events.map((event) => event.id),
    ),
  ]);

  return {
    query,
    type,
    businesses: businesses.map(businessService.toPublicBusiness),
    posts: posts.map((post) =>
      communityService.toPublicPost(post, {
        isLikedByMe: liked.has(post.id),
      }),
    ),
    events: events.map((event) =>
      eventService.toPublicEvent(event, {
        isGoingByMe: going.has(event.id),
      }),
    ),
  };
}

/**
 * Top featured businesses for idle “Trending” chips.
 * @returns {{ businesses }}
 */
async function listTrendingFeatured() {
  const businesses = await db.Business.findAll({
    where: { isFeatured: true },
    attributes: BUSINESS_LIST_ATTRIBUTES,
    order: [
      ["ratingAvg", "DESC"],
      ["name", "ASC"],
    ],
    limit: TRENDING_LIMIT,
  });

  return {
    businesses: businesses.map(businessService.toPublicBusiness),
  };
}

module.exports = {
  SEARCH_TYPES,
  search,
  listTrendingFeatured,
};
