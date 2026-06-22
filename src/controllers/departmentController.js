const asyncHandler = require("../utils/asyncHandler");
const Department = require("../models/Department");
const StockIssue = require("../models/StockIssue");
const Request = require("../models/Request");
const { emitInventoryUpdate } = require("../utils/realtime");

const getDepartments = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (search) filter.name = new RegExp(search, "i");

  const departments = await Department.find(filter).sort({ name: 1 });
  res.json(departments);
});

const getDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) return res.status(404).json({ message: "Department not found" });

  const issues = await StockIssue.find({ issuedToDepartment: department._id })
    .populate("itemId", "itemName category unit")
    .populate("issuedBy", "name")
    .sort({ issueDate: -1 });

  const requests = await Request.find({ department: department._id })
    .populate("itemId", "itemName category unit")
    .populate("requestedBy", "name")
    .sort({ createdAt: -1 });

  res.json({ department, issues, requests });
});

const createDepartment = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Department name is required" });
  }

  const department = await Department.create({ name, description, status: status || "active" });
  res.status(201).json(department);
  emitInventoryUpdate({ area: "departments", areas: ["departments", "dashboard", "reports"], action: "created", departmentId: department._id });
});

const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) return res.status(404).json({ message: "Department not found" });

  ["name", "description", "status"].forEach((field) => {
    if (req.body[field] !== undefined) department[field] = req.body[field];
  });

  await department.save();
  res.json(department);
  emitInventoryUpdate({ area: "departments", areas: ["departments", "dashboard", "reports"], action: "updated", departmentId: department._id });
});

const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findByIdAndDelete(req.params.id);
  if (!department) return res.status(404).json({ message: "Department not found" });

  res.json({ message: "Department deleted" });
  emitInventoryUpdate({ area: "departments", areas: ["departments", "dashboard", "reports"], action: "deleted", departmentId: department._id });
});

module.exports = { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment };
