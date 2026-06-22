const express = require("express");
const { getIssues, getIssue, createIssue } = require("../controllers/stockIssueController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getIssues);
router.post("/", allowRoles("Super Admin", "Store Manager"), createIssue);
router.get("/:id", getIssue);

module.exports = router;
