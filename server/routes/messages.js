const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

router.get("/:username", async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.params.username },
        { receiver: req.params.username },
      ],
    }).sort("timestamp");
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/group/:groupId", async (req, res) => {
  try {
    const messages = await Message.find({ groupId: req.params.groupId }).sort("timestamp");
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;