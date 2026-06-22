const express = require("express");
const { login, register, me } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/login", login);
router.post("/register", protect, allowRoles("Super Admin"), register);
router.get("/me", protect, me);

module.exports = router;
