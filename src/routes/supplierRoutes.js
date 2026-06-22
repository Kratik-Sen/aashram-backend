const express = require("express");
const {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier
} = require("../controllers/supplierController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getSuppliers);
router.get("/:id", getSupplier);
router.post("/", allowRoles("Super Admin", "Store Manager"), createSupplier);
router.put("/:id", allowRoles("Super Admin", "Store Manager"), updateSupplier);
router.delete("/:id", allowRoles("Super Admin"), deleteSupplier);

module.exports = router;
