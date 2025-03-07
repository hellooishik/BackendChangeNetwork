const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  action: {
    type: String,
    enum: ["CREATE", "UPDATE", "DELETE"],
    required: true,
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  details: {
    type: String,
  },
});

module.exports = mongoose.model("AuditLog", AuditLogSchema);
