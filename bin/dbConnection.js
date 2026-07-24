// SQLite only — Sequelize + sqlite3. Models are registered in models/index.js.
const fs = require("fs");
const path = require("path");
const config = require("../config/config.json");
const { Sequelize } = require("sequelize");

const env = config.development;
const rel = env.storage || "data/database.sqlite";
const storagePath = path.isAbsolute(rel)
  ? rel
  : path.join(__dirname, "..", rel);

fs.mkdirSync(path.dirname(storagePath), { recursive: true });

const logging = env.logging === true ? console.log : false;

const database = new Sequelize({
  dialect: "sqlite",
  storage: storagePath,
  logging,
});

database
  .authenticate()
  .then(() => {
    console.log("SQLite connected:", storagePath);
  })
  .catch((error) => {
    console.log("Database connection error:", error.message);
  });

module.exports = database;
