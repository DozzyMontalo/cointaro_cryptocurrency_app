const express = require("express");
const router = express.Router();
const Task = require("../model/task");
const { auth } = require("../middleware/auth");

// GET route to fetch all tasks assigned to the user
router.get("/tasks", auth, async (req, res) => {
  try {
    // Find all tasks assigned to the user
    const tasks = await Task.find({ owner: req.user._id });

    res.json(tasks);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// PATCH route to mark a task as completed
router.patch("/tasks/:id/complete", auth, async (req, res) => {
  const taskId = req.params.id;

  try {
    // Find the task by ID and update its completed status
    const task = await Task.findOneAndUpdate(
      { _id: taskId, owner: req.user._id },
      { completed: true }
    );

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    console.error("Failed to complete task:", error);
    res.status(500).json({ error: "Failed to complete task" });
  }
});

module.exports = router;
