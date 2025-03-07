const express = require("express");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const AuditLog = require("../models/AuditLog");

const router = express.Router();

/**
 * @route   GET /api/audit-logs
 * @desc    Fetch all audit logs (Admin Only)
 * @access  Private (Admin)
 */
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate("user", "name email")
      .populate("task", "title")
      .sort({ timestamp: -1 });

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching audit logs", error });
  }
});

module.exports = router;
