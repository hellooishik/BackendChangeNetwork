require("dotenv").config();

// Default Modules
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const auditRoutes = require("./routes/auditRoutes");

// Set the Express app

const app = express();

// Middleware setup

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
app.use("/api/auth", authRoutes);
// For Task Route
app.use("/api/tasks", taskRoutes);
// For notification 
app.use("/api/notifications", notificationRoutes);
// audit models
app.use("/api/audit-logs", auditRoutes);
// Connect to MongoDB

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));


// Basic Route
app.get("/", (req, res) => {
    res.send("Task Management API is running...");
  });

  
// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});