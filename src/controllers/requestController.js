const asyncHandler = require("../utils/asyncHandler");
const { adjustStock, toPositiveNumber } = require("../utils/stock");
const Item = require("../models/Item");
const Department = require("../models/Department");
const Request = require("../models/Request");
const { paginatedResponse } = require("../utils/pagination");
const { emitInventoryUpdate } = require("../utils/realtime");

const staffRoles = ["Kitchen Staff", "Department Staff"];

const getRequests = asyncHandler(async (req, res) => {
  const { status, departmentId, itemId } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (departmentId) filter.department = departmentId;
  if (itemId) filter.itemId = itemId;
  if (staffRoles.includes(req.user.role)) filter.requestedBy = req.user._id;

  return paginatedResponse({
    req,
    res,
    query: Request.find(filter)
      .populate("itemId", "itemName category unit currentStock")
      .populate("requestedBy", "name role")
      .populate("department", "name")
      .populate("approvedBy rejectedBy issuedBy", "name")
      .sort({ createdAt: -1 }),
    countQuery: Request.countDocuments(filter)
  });
});

const createRequest = asyncHandler(async (req, res) => {
  const { itemId, quantity, department, reason, note } = req.body;

  if (!itemId || !quantity || !reason) {
    return res.status(400).json({ message: "Item, quantity, and reason are required" });
  }

  const parsedQuantity = toPositiveNumber(quantity);
  const departmentId = department || req.user.department?._id || req.user.department;

  if (!departmentId) {
    return res.status(400).json({ message: "Department is required" });
  }

  const [item, departmentRecord] = await Promise.all([
    Item.findById(itemId),
    Department.findById(departmentId)
  ]);

  if (!item) return res.status(404).json({ message: "Item not found" });
  if (!departmentRecord) return res.status(404).json({ message: "Department not found" });

  const request = await Request.create({
    itemId,
    quantity: parsedQuantity,
    requestedBy: req.user._id,
    department: departmentId,
    reason,
    note
  });

  const populated = await Request.findById(request._id)
    .populate("itemId", "itemName category unit currentStock")
    .populate("requestedBy", "name role")
    .populate("department", "name");

  res.status(201).json(populated);
  emitInventoryUpdate({
    area: "requests",
    areas: ["requests", "dashboard", "reports"],
    action: "created",
    requestId: request._id,
    departmentId
  });
});

const approveRequest = asyncHandler(async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found" });
  if (request.status !== "pending") {
    return res.status(400).json({ message: "Only pending requests can be approved" });
  }

  request.status = "approved";
  request.approvedBy = req.user._id;
  request.approvedAt = new Date();
  request.note = req.body.note || request.note;
  await request.save();

  const populated = await Request.findById(request._id)
    .populate("itemId", "itemName category unit currentStock")
    .populate("requestedBy", "name")
    .populate("department", "name")
    .populate("approvedBy", "name");

  res.json(populated);
  emitInventoryUpdate({
    area: "requests",
    areas: ["requests", "dashboard", "reports"],
    action: "approved",
    requestId: request._id,
    departmentId: request.department
  });
});

const rejectRequest = asyncHandler(async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found" });
  if (request.status !== "pending") {
    return res.status(400).json({ message: "Only pending requests can be rejected" });
  }

  request.status = "rejected";
  request.rejectedBy = req.user._id;
  request.rejectedAt = new Date();
  request.note = req.body.note || request.note;
  await request.save();

  const populated = await Request.findById(request._id)
    .populate("itemId", "itemName category unit currentStock")
    .populate("requestedBy", "name")
    .populate("department", "name")
    .populate("rejectedBy", "name");

  res.json(populated);
  emitInventoryUpdate({
    area: "requests",
    areas: ["requests", "dashboard", "reports"],
    action: "rejected",
    requestId: request._id,
    departmentId: request.department
  });
});

const issueRequest = asyncHandler(async (req, res) => {
  const request = await Request.findById(req.params.id).populate("itemId");
  if (!request) return res.status(404).json({ message: "Request not found" });
  if (request.status !== "approved") {
    return res.status(400).json({ message: "Only approved requests can be issued" });
  }

  if (request.itemId.currentStock < request.quantity) {
    return res.status(400).json({ message: `Insufficient stock. Available stock is ${request.itemId.currentStock}` });
  }

  await adjustStock({
    itemId: request.itemId._id,
    type: "OUT",
    source: "Request",
    quantity: request.quantity,
    performedBy: req.user._id,
    relatedModel: "Request",
    relatedId: request._id,
    note: req.body.note || request.reason,
    suppressRealtime: true
  });

  request.status = "issued";
  request.issuedBy = req.user._id;
  request.issuedAt = new Date();
  request.note = req.body.note || request.note;
  await request.save();

  const populated = await Request.findById(request._id)
    .populate("itemId", "itemName category unit currentStock")
    .populate("requestedBy", "name")
    .populate("department", "name")
    .populate("approvedBy issuedBy", "name");

  res.json(populated);
  emitInventoryUpdate({
    area: "requests",
    areas: ["requests", "items", "stock", "dashboard", "reports"],
    action: "issued",
    requestId: request._id,
    itemId: request.itemId._id,
    departmentId: request.department
  });
});

module.exports = { getRequests, createRequest, approveRequest, rejectRequest, issueRequest };
