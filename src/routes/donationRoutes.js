const express = require("express");
const { getDonations, getDonation, createDonation } = require("../controllers/donationController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getDonations);
router.post(
  "/",
  allowRoles("Super Admin", "Store Manager"),
  upload.fields([
    { name: "images", maxCount: 3 },
    { name: "image", maxCount: 1 }
  ]),
  createDonation
);
router.get("/:id", getDonation);

module.exports = router;
