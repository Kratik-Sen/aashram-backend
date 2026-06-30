const express = require("express");
const { getVapidPublicKey, subscribe, unsubscribe } = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/vapid-public-key", getVapidPublicKey);
router.use(protect);
router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

module.exports = router;
