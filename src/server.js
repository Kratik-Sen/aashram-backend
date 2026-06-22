require("dotenv").config();
const express = require("express");
const dns = require('dns');
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const itemRoutes = require("./routes/itemRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const stockIssueRoutes = require("./routes/stockIssueRoutes");
const donationRoutes = require("./routes/donationRoutes");
const requestRoutes = require("./routes/requestRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

dns.setServers([
  '8.8.8.8',
  '1.1.1.1'
])
const app = express();
const port = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ message: "Aashram Inventory Management API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/issues", stockIssueRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Server error";

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(statusCode).json({ message });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
