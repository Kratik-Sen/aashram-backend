const express = require("express");
const { getDashboard, getDashboardMetric } = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getDashboard);
router.get("/metrics/:metric", protect, getDashboardMetric);

module.exports = router;
