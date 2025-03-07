const express = require("express");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const Task = require("../models/Task");
const Notification = require("../models/Notification");



const router = express.Router();
const createNotification = async (userId, message) => {
    try {
      const notification = new Notification({ user: userId, message });
      await notification.save();
    } catch (error) {
      console.error("Notification Error:", error);
    }
  };

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private (User/Admin)
 */
router.post("/", authMiddleware, async (req, res) => {
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
  
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ message: "Error creating task", error });
    }
  });

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks (Admin) or only user tasks
 * @access  Private (User/Admin)
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    let tasks;
    if (req.user.role === "admin") {
      tasks = await Task.find().populate("createdBy", "name email").populate("assignedTo", "name email");
    } else {
      tasks = await Task.find({ createdBy: req.user.userId }).populate("assignedTo", "name email");
    }

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error });
  }
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task
 * @access  Private (Only task owner or admin)
 */
router.put("/:id/status", authMiddleware, async (req, res) => {
    try {
      const { status } = req.body;
  
      // Check if status is valid
      if (!["Pending", "In Progress", "Completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status update" });
      }
  
      let task = await Task.findById(req.params.id);
  
      if (!task) return res.status(404).json({ message: "Task not found" });
  
      // Only the task owner OR admin can update the status
      if (task.createdBy.toString() !== req.user.userId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized to update this task" });
      }
  
      task.status = status;
      await task.save();
  
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
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.createdBy.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized to delete this task" });
    }

    await task.deleteOne();
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error });
  }
});

module.exports = router;
