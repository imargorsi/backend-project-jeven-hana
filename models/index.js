const sequelize = require("../bin/dbConnection");
const { DataTypes } = require("sequelize");

const defineDemoItem = require("./definitions/demoItem");
const defineUser = require("./definitions/user");
const defineEvent = require("./definitions/event");
const defineEventGoing = require("./definitions/eventGoing");
const defineCommunityPost = require("./definitions/communityPost");
const defineCommunityPostLike = require("./definitions/communityPostLike");
const defineBusiness = require("./definitions/business");
const defineBusinessReview = require("./definitions/businessReview");
const defineNotification = require("./definitions/notification");

const DemoItem = defineDemoItem(sequelize, DataTypes);
const User = defineUser(sequelize, DataTypes);
const Event = defineEvent(sequelize, DataTypes);
const EventGoing = defineEventGoing(sequelize, DataTypes);
const CommunityPost = defineCommunityPost(sequelize, DataTypes);
const CommunityPostLike = defineCommunityPostLike(sequelize, DataTypes);
const Business = defineBusiness(sequelize, DataTypes);
const BusinessReview = defineBusinessReview(sequelize, DataTypes);
const Notification = defineNotification(sequelize, DataTypes);

User.hasMany(Event, {
  foreignKey: "createdByUserId",
  as: "createdEvents",
});
Event.belongsTo(User, {
  foreignKey: "createdByUserId",
  as: "creator",
});

User.belongsToMany(Event, {
  through: EventGoing,
  foreignKey: "userId",
  otherKey: "eventId",
  as: "goingEvents",
});
Event.belongsToMany(User, {
  through: EventGoing,
  foreignKey: "eventId",
  otherKey: "userId",
  as: "goingUsers",
});

EventGoing.belongsTo(Event, { foreignKey: "eventId", as: "event" });
EventGoing.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(CommunityPost, {
  foreignKey: "createdByUserId",
  as: "communityPosts",
});
CommunityPost.belongsTo(User, {
  foreignKey: "createdByUserId",
  as: "author",
});

User.belongsToMany(CommunityPost, {
  through: CommunityPostLike,
  foreignKey: "userId",
  otherKey: "postId",
  as: "likedPosts",
});
CommunityPost.belongsToMany(User, {
  through: CommunityPostLike,
  foreignKey: "postId",
  otherKey: "userId",
  as: "likedByUsers",
});

CommunityPostLike.belongsTo(CommunityPost, {
  foreignKey: "postId",
  as: "post",
});
CommunityPostLike.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(Business, {
  foreignKey: "createdByUserId",
  as: "businesses",
});
Business.belongsTo(User, {
  foreignKey: "createdByUserId",
  as: "owner",
});

User.hasMany(BusinessReview, {
  foreignKey: "createdByUserId",
  as: "businessReviews",
});
BusinessReview.belongsTo(User, {
  foreignKey: "createdByUserId",
  as: "author",
});

Business.hasMany(BusinessReview, {
  foreignKey: "businessId",
  as: "reviews",
  onDelete: "CASCADE",
});
BusinessReview.belongsTo(Business, {
  foreignKey: "businessId",
  as: "business",
});

User.hasMany(Notification, {
  foreignKey: "userId",
  as: "notifications",
  onDelete: "CASCADE",
});
Notification.belongsTo(User, {
  foreignKey: "userId",
  as: "recipient",
});
Notification.belongsTo(User, {
  foreignKey: "actorUserId",
  as: "actor",
});

const db = {
  sequelize,
  DemoItem,
  User,
  Event,
  EventGoing,
  CommunityPost,
  CommunityPostLike,
  Business,
  BusinessReview,
  Notification,
};

module.exports = { db };
