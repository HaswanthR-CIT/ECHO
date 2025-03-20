const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Add password field
  online: { type: Boolean, default: false },
  socketId: { type: String },
  lastLogin: { type: Date },
});

module.exports = mongoose.model("User", userSchema);