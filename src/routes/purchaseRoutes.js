const express = require("express");
const { getPurchases, getPurchase, createPurchase, deletePurchase } = require("../controllers/purchaseController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getPurchases);
router.post("/", allowRoles("Super Admin", "Store Manager"), upload.single("billImage"), createPurchase);
router.get("/:id", getPurchase);
router.delete("/:id", allowRoles("Super Admin"), deletePurchase);

module.exports = router;
