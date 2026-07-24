const { clerkClient } = require("@clerk/express");
const { db } = require("../models");

function resolveRole(clerkUser) {
  const metaRole = clerkUser?.publicMetadata?.role;
  return metaRole === "admin" ? "admin" : "user";
}

function primaryEmail(clerkUser) {
  const addresses = clerkUser?.emailAddresses || [];
  const primaryId = clerkUser?.primaryEmailAddressId;
  const primary = addresses.find((item) => item.id === primaryId);
  return primary?.emailAddress || addresses[0]?.emailAddress || null;
}

/**
 * Upsert local User from Clerk user id (fetch full profile from Clerk).
 */
async function syncUserFromClerk(clerkId) {
  const clerkUser = await clerkClient.users.getUser(clerkId);

  const payload = {
    clerkId,
    email: primaryEmail(clerkUser),
    firstName: clerkUser.firstName || null,
    lastName: clerkUser.lastName || null,
    imageUrl: clerkUser.imageUrl || null,
    role: resolveRole(clerkUser),
  };

  const existing = await db.User.findOne({ where: { clerkId } });
  if (existing) {
    await existing.update(payload);
    return existing;
  }

  return db.User.create(payload);
}

async function findByClerkId(clerkId) {
  return db.User.findOne({ where: { clerkId } });
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = {
  syncUserFromClerk,
  findByClerkId,
  toPublicUser,
  resolveRole,
};
