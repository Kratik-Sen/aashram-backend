const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const { paginatedResponse } = require("../utils/pagination");
const { emitInventoryUpdate } = require("../utils/realtime");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const listUsers = asyncHandler(async (req, res) => {
  const { search, role, status } = req.query;
  const filter = {};

  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, "i") },
      { email: new RegExp(search, "i") }
    ];
  }

  return paginatedResponse({
    req,
    res,
    query: User.find(filter).populate("department", "name").sort({ createdAt: -1 }),
    countQuery: User.countDocuments(filter)
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const { name, email, role, department, status, password } = req.body;
  const user = await User.findById(req.params.id).select("+password");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (email !== undefined) {
    const nextEmail = normalizeEmail(email);
    if (!nextEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const emailOwner = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
    if (emailOwner) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    user.email = nextEmail;
  }

  if (name !== undefined) user.name = String(name).trim();
  if (role !== undefined) user.role = role;
  if (department !== undefined) user.department = department || null;
  if (status !== undefined) user.status = status;
  if (password) user.password = password;

  const duplicateIdentity = await User.findOne({
    _id: { $ne: user._id },
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || null
  });
  if (duplicateIdentity) {
    return res.status(409).json({ message: "A user with the same name, email, role, and department already exists" });
  }

  await user.save();
  const updated = await User.findById(user._id).populate("department", "name");
  res.json(updated);
  emitInventoryUpdate({ area: "users", areas: ["users"], action: "updated", userId: user._id, userName: updated.name });
});

const deleteUser = asyncHandler(async (req, res) => {
  if (req.user._id.toString() === req.params.id) {
    return res.status(400).json({ message: "You cannot delete your own account" });
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ message: "User deleted" });
  emitInventoryUpdate({ area: "users", areas: ["users"], action: "deleted", userId: user._id.toString(), userName: user.name });
});

module.exports = { listUsers, updateUser, deleteUser };
