const express = require("express");
const {
  stockReport,
  purchaseReport,
  issueReport,
  donationReport,
  lowStockReport,
  monthlyExpenseReport,
  departmentUsageReport,
  transactionsReport
} = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/stock", stockReport);
router.get("/purchases", purchaseReport);
router.get("/issues", issueReport);
router.get("/donations", donationReport);
router.get("/low-stock", lowStockReport);
router.get("/monthly-expense", monthlyExpenseReport);
router.get("/department-usage", departmentUsageReport);
router.get("/transactions", transactionsReport);

module.exports = router;
