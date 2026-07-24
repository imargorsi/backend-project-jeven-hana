// Neon Postgres via ../bin/dbConnection — see readme.md.
const sequelize = require("../bin/dbConnection");
const { DataTypes } = require("sequelize");

const defineDemoItem = require("./definitions/demoItem");
const defineUser = require("./definitions/user");

const DemoItem = defineDemoItem(sequelize, DataTypes);
const User = defineUser(sequelize, DataTypes);

const db = { sequelize, DemoItem, User };

module.exports = { db };
