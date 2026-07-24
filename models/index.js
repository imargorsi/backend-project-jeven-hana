const sequelize = require("../bin/dbConnection");
const { DataTypes } = require("sequelize");

const defineDemoItem = require("./definitions/demoItem");
const defineUser = require("./definitions/user");
const defineEvent = require("./definitions/event");
const defineEventGoing = require("./definitions/eventGoing");
const defineCommunityPost = require("./definitions/communityPost");
const defineCommunityPostLike = require("./definitions/communityPostLike");
const defineBusiness = require("./definitions/business");

const DemoItem = defineDemoItem(sequelize, DataTypes);
const User = defineUser(sequelize, DataTypes);
const Event = defineEvent(sequelize, DataTypes);
const EventGoing = defineEventGoing(sequelize, DataTypes);
const CommunityPost = defineCommunityPost(sequelize, DataTypes);
const CommunityPostLike = defineCommunityPostLike(sequelize, DataTypes);
const Business = defineBusiness(sequelize, DataTypes);

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

const db = {
  sequelize,
  DemoItem,
  User,
  Event,
  EventGoing,
  CommunityPost,
  CommunityPostLike,
  Business,
};

module.exports = { db };
