const { db } = require("../models");

const getAllItems = async () => {
  return db.DemoItem.findAll({ order: [["id", "ASC"]] });
};

const getItemById = async (id) => {
  return db.DemoItem.findByPk(id);
};

const createItem = async (payload) => {
  return db.DemoItem.create(payload);
};

const updateItem = async (id, payload) => {
  const item = await getItemById(id);
  if (!item) return null;
  return item.update(payload);
};

const deleteItem = async (id) => {
  const item = await getItemById(id);
  if (!item) return null;
  await item.destroy();
  return item;
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
};
