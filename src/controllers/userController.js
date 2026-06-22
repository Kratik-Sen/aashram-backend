const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");

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

  const users = await User.find(filter).populate("department", "name").sort({ createdAt: -1 });
  res.json(users);
});

const updateUser = asyncHandler(async (req, res) => {
  const { name, role, department, status, password } = req.body;
  const user = await User.findById(req.params.id).select("+password");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (department !== undefined) user.department = department || null;
  if (status !== undefined) user.status = status;
  if (password) user.password = password;

  await user.save();
  const updated = await User.findById(user._id).populate("department", "name");
  res.json(updated);
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
});

module.exports = { listUsers, updateUser, deleteUser };
