const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.userId }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications", error });
  }
});

module.exports = router;
