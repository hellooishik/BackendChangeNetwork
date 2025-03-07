const express = require("express");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const Task = require("../models/Task");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const logger = require("../middleware/logger");

const router = express.Router();

/**
 * Apply rate limiting to prevent abuse
 */
const taskLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per 15 minutes
  message: "Too many requests, please try again later",
});

router.use(taskLimiter);

/**
 * Helper function to create notifications
 */
const createNotification = async (userId, message) => {
  try {
    await Notification.create({ user: userId, message });
  } catch (error) {
    console.error("Notification Error:", error);
  }
};

/**
 * Helper function to log audit actions
 */
const logAction = async (userId, action, taskId, details) => {
  try {
    await AuditLog.create({
      user: userId,
      action,
      task: taskId,
      details,
    });
  } catch (error) {
    console.error("Audit Log Error:", error);
  }
};

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private (User/Admin)
 */
router.post(
  "/",
  authMiddleware,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("dueDate").isISO8601().withMessage("Due Date must be a valid date"),
  ],
  async (req, res) => {
    logger.info("POST /api/tasks - Creating a new task");

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, description, dueDate, assignedTo } = req.body;

      const task = new Task({
        title,
        description,
        dueDate,
        assignedTo,
        createdBy: req.user.userId,
      });

      await task.save();

      // Notify the assigned user
      if (assignedTo) {
        await createNotification(assignedTo, `You have been assigned a new task: ${title}`);
      }

      // Log the creation
      await logAction(req.user.userId, "CREATE", task._id, `Task '${title}' created`);

      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ message: "Error creating task", error });
    }
  }
);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks (Admin) or only user tasks
 * @access  Private (User/Admin)
 */
router.get("/", authMiddleware, async (req, res) => {
  logger.info("GET /api/tasks - Fetching tasks");

  try {
    let tasks;
    if (req.user.role === "admin") {
      tasks = await Task.find()
        .populate("createdBy", "name email")
        .populate("assignedTo", "name email");
    } else {
      tasks = await Task.find({ createdBy: req.user.userId })
        .populate("assignedTo", "name email");
    }

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error });
  }
});

/**
 * @route   PUT /api/tasks/:id/status
 * @desc    Update task status (Only task owner or admin)
 * @access  Private
 */
router.put("/:id/status", authMiddleware, async (req, res) => {
  logger.info(`PUT /api/tasks/${req.params.id}/status - Updating task status`);

  try {
    const { status } = req.body;

    // Check if the status is valid
    if (!["Pending", "In Progress", "Completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status update" });
    }

    let task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Only task owner or admin can update the status
    if (task.createdBy.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized to update this task" });
    }

    task.status = status;
    await task.save();

    // Log the update
    await logAction(req.user.userId, "UPDATE", task._id, `Task status changed to '${status}'`);

    res.status(200).json({ message: "Task status updated", task });
  } catch (error) {
    res.status(500).json({ message: "Error updating task status", error });
  }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task
 * @access  Private (Only task owner or admin)
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  logger.info(`DELETE /api/tasks/${req.params.id} - Deleting a task`);

  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.createdBy.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized to delete this task" });
    }

    await task.deleteOne();

    // Log the deletion
    await logAction(req.user.userId, "DELETE", task._id, `Task '${task.title}' deleted`);

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error });
  }
});

module.exports = router;
