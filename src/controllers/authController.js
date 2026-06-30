const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const { emitInventoryUpdate } = require("../utils/realtime");

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const normalizeDepartment = (department) => department || null;

const buildUserIdentityFilter = ({ name, email, role, department }) => ({
  name: String(name || "").trim(),
  email: String(email || "").trim().toLowerCase(),
  role,
  department: normalizeDepartment(department)
});

const userResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  status: user.status
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password").populate("department", "name");

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (user.status !== "active") {
    return res.status(403).json({ message: "Your account is inactive" });
  }

  res.json({
    token: signToken(user._id),
    user: userResponse(user)
  });
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, status } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Name, email, password, and role are required" });
  }

  const identityFilter = buildUserIdentityFilter({ name, email, role, department });
  const exactExists = await User.findOne(identityFilter);
  if (exactExists) {
    return res.status(409).json({ message: "A user with the same name, email, role, and department already exists" });
  }

  const exists = await User.findOne({ email: identityFilter.email });
  if (exists) {
    return res.status(409).json({ message: "A user with this email already exists" });
  }

  const user = await User.create({
    name: identityFilter.name,
    email: identityFilter.email,
    password,
    role,
    department: identityFilter.department,
    status: status || "active"
  });

  const populatedUser = await User.findById(user._id).populate("department", "name");
  res.status(201).json({ user: userResponse(populatedUser) });
  emitInventoryUpdate({ area: "users", areas: ["users"], action: "created", userId: user._id, userName: populatedUser.name });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: userResponse(req.user) });
});

module.exports = { login, register, me };
