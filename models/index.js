// Neon Postgres via ../bin/dbConnection — see readme.md.
const sequelize = require("../bin/dbConnection");
const { DataTypes } = require("sequelize");

const defineDemoItem = require("./definitions/demoItem");
const defineUser = require("./definitions/user");
const defineEvent = require("./definitions/event");
const defineEventGoing = require("./definitions/eventGoing");

const DemoItem = defineDemoItem(sequelize, DataTypes);
const User = defineUser(sequelize, DataTypes);
const Event = defineEvent(sequelize, DataTypes);
const EventGoing = defineEventGoing(sequelize, DataTypes);

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

const db = { sequelize, DemoItem, User, Event, EventGoing };

module.exports = { db };
