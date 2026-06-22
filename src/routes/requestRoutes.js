const express = require("express");
const {
  getRequests,
  createRequest,
  approveRequest,
  rejectRequest,
  issueRequest
} = require("../controllers/requestController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getRequests);
router.post("/", allowRoles("Super Admin", "Store Manager", "Kitchen Staff", "Department Staff"), createRequest);
router.put("/:id/approve", allowRoles("Super Admin", "Store Manager"), approveRequest);
router.put("/:id/reject", allowRoles("Super Admin", "Store Manager"), rejectRequest);
router.put("/:id/issue", allowRoles("Super Admin", "Store Manager"), issueRequest);

module.exports = router;
