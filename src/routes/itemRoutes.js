const express = require("express");
const {
  getItems,
  getLowStockItems,
  getItem,
  createItem,
  updateItem,
  deleteItem
} = require("../controllers/itemController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getItems);
router.get("/low-stock", getLowStockItems);
router.post("/", allowRoles("Super Admin", "Store Manager"), createItem);
router.get("/:id", getItem);
router.put("/:id", allowRoles("Super Admin", "Store Manager"), updateItem);
router.delete("/:id", allowRoles("Super Admin"), deleteItem);

module.exports = router;
