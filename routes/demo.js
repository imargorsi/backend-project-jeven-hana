var express = require("express");
var router = express.Router();
const demoService = require("../service/demoService");

// GET /api/demo
router.get("/api/demo", async function (req, res, next) {
  try {
    const items = await demoService.getAllItems();
    res.json({ ok: true, items });
  } catch (error) {
    next(error);
  }
});

// GET /api/demo/:id
router.get("/api/demo/:id", async function (req, res, next) {
  try {
    const item = await demoService.getItemById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, message: "Demo item not found" });
    res.json({ ok: true, item });
  } catch (error) {
    next(error);
  }
});

// POST /api/demo
router.post("/api/demo", async function (req, res, next) {
  try {
    const body = req.body;

    if (!body || !body.name) {
      return res.status(400).json({ ok: false, message: "`name` is required" });
    }

    const item = await demoService.createItem({
      name: body.name,
      description: body.description || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
    });
    res.status(201).json({ ok: true, item });
  } catch (error) {
    next(error);
  }
});

// PUT /api/demo/:id
router.put("/api/demo/:id", async function (req, res, next) {
  try {
    const item = await demoService.updateItem(req.params.id, {
      name: req.body.name,
      description: req.body.description,
      isActive: req.body.isActive,
    });

    if (!item) {
      return res.status(404).json({ ok: false, message: "Demo item not found" });
    }

    res.json({ ok: true, item });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/demo/:id
router.delete("/api/demo/:id", async function (req, res, next) {
  try {
    const item = await demoService.deleteItem(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: "Demo item not found" });
    }

    res.json({ ok: true, message: "Deleted", item });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
