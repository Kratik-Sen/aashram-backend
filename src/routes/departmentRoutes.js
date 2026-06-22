const express = require("express");
const {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require("../controllers/departmentController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getDepartments);
router.get("/:id", getDepartment);
router.post("/", allowRoles("Super Admin"), createDepartment);
router.put("/:id", allowRoles("Super Admin"), updateDepartment);
router.delete("/:id", allowRoles("Super Admin"), deleteDepartment);

module.exports = router;
