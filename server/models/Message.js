const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  content: { type: String },
  image: { type: String },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
});

module.exports = mongoose.model("Message", messageSchema);