const express = require("express");
const { listUsers, updateUser, deleteUser } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, allowRoles("Super Admin"));

router.get("/", listUsers);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
