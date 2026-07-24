// SQLite via ../bin/dbConnection — see readme.md.
const sequelize = require("../bin/dbConnection");

// Register models here after you add definitions — see readme.md "Define a new Sequelize model".
//
// Example when you have models/definitions/meal.js that exports (sequelize) => Model:
//   const defineMeal = require("./definitions/meal");
//   const Meal = defineMeal(sequelize);
//   const db = { sequelize, Meal };
//
// Then in routes: const { db } = require("../models"); await db.Meal.findAll();

const defineDemoItem = require("./definitions/demoItem");
const { DataTypes } = require("sequelize");

const DemoItem = defineDemoItem(sequelize, DataTypes);

const db = { sequelize, DemoItem };

module.exports = { db };
