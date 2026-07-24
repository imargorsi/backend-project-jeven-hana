var express = require("express");
var router = express.Router();
const demoService = require("../service/demoService");
const { requireAuth } = require("../middleware/requireAuth");
const { success, fail } = require("../utils/apiResponse");

// Public reads — guests can browse (matches mobile product).

// GET /api/demo
router.get("/api/demo", async function (req, res, next) {
  try {
    const items = await demoService.getAllItems();
    return success(res, { items }, "OK");
  } catch (error) {
    next(error);
  }
});

// GET /api/demo/:id
router.get("/api/demo/:id", async function (req, res, next) {
  try {
    const item = await demoService.getItemById(req.params.id);
    if (!item) return fail(res, "Demo item not found", 404);
    return success(res, { item }, "OK");
  } catch (error) {
    next(error);
  }
});

// Mutations require Clerk sign-in (same gating idea as mobile account actions).

// POST /api/demo
router.post("/api/demo", requireAuth, async function (req, res, next) {
  try {
    const body = req.body;

    if (!body || !body.name) {
      return fail(res, "`name` is required", 400, [{ field: "name" }]);
    }

    const item = await demoService.createItem({
      name: body.name,
      description: body.description || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
    });
    return success(res, { item }, "Created", 201);
  } catch (error) {
    next(error);
  }
});

// PUT /api/demo/:id
router.put("/api/demo/:id", requireAuth, async function (req, res, next) {
  try {
    const item = await demoService.updateItem(req.params.id, {
      name: req.body.name,
      description: req.body.description,
      isActive: req.body.isActive,
    });

    if (!item) {
      return fail(res, "Demo item not found", 404);
    }

    return success(res, { item }, "Updated");
  } catch (error) {
    next(error);
  }
});

// DELETE /api/demo/:id
router.delete("/api/demo/:id", requireAuth, async function (req, res, next) {
  try {
    const item = await demoService.deleteItem(req.params.id);
    if (!item) {
      return fail(res, "Demo item not found", 404);
    }

    return success(res, { item }, "Deleted");
  } catch (error) {
    next(error);
  }
});

module.exports = router;
