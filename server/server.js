const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken"); // Add JWT
const User = require("./models/User");
const Message = require("./models/Message");
const Group = require("./models/Group");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "http://localhost:3000" } });

app.use(cors());
app.use(express.json());

// JWT Secret (replace with a secure key in production, e.g., store in .env)
const JWT_SECRET = "your_jwt_secret";

// Middleware to Verify JWT Token
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Expecting "Bearer <token>"
  if (!token) {
    return res.status(401).json({ error: "Access denied: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Add decoded user info to request
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
};

// Routes
app.use("/auth", require("./routes/auth")); // Unprotected route for login/signup
app.use("/messages", authenticateToken, require("./routes/messages")); // Protected
app.use("/users", authenticateToken, require("./routes/users")); // Protected

// Protect Existing Routes
app.get("/users/username/:username", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/groups", authenticateToken, async (req, res) => {
  try {
    const { name, members, createdBy } = req.body;
    console.log("Creating group with members:", members);
    const group = new Group({ name, members, createdBy });
    await group.save();
    console.log("Group created:", group);
    res.status(201).json(group);

    const creator = await User.findById(createdBy);
    members.forEach(async (memberId) => {
      const member = await User.findById(memberId);
      if (member && member.socketId && io.sockets.sockets.get(member.socketId)) {
        io.to(member.socketId).emit("personalNotification", {
          message: `You've been added to '${group.name}' by ${creator.username}`,
        });
        io.sockets.sockets.get(member.socketId)?.join(group._id.toString());
        console.log(`User ${member.username} joined group ${group._id} upon creation`);
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/groups/:userId", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Fetching groups for userId:", userId);
    const groups = await Group.find({ members: userId }).populate("members", "username");
    console.log("Found groups:", groups);
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/groups/:id/add", authenticateToken, async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: req.body.userId } },
      { new: true }
    ).populate("members", "username");
    res.json(group);

    const newMember = await User.findById(req.body.userId);
    const addedBy = await User.findById(req.body.addedBy);
    if (newMember && newMember.socketId && io.sockets.sockets.get(newMember.socketId)) {
      io.to(newMember.socketId).emit("personalNotification", {
        message: `You've been added to '${group.name}' by ${addedBy.username}`,
      });
      io.sockets.sockets.get(newMember.socketId)?.join(group._id.toString());
      console.log(`User ${newMember.username} joined group ${group._id} upon being added`);
    }

    io.to(group._id.toString()).emit("groupNotification", {
      message: `${addedBy.username} added ${newMember.username} to the group`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/groups/:id/remove", authenticateToken, async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: req.body.userId } },
      { new: true }
    ).populate("members", "username");
    res.json(group);

    const removedMember = await User.findById(req.body.userId);
    if (removedMember && removedMember.socketId) {
      io.sockets.sockets.get(removedMember.socketId)?.leave(group._id.toString());
      console.log(`User ${removedMember.username} left group ${group._id} upon removal`);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/messages/group/:groupId", authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({ groupId: req.params.groupId }).sort("timestamp");
    console.log(`Fetched ${messages.length} messages for group ${req.params.groupId}`);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MongoDB Connection
mongoose
  .connect("mongodb://localhost:27017/messaging_app")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// AI Responses (Unchanged)
const aiResponses = [
  { pattern: /^hello|hi|hey$/i, responses: ["Hi there!", "Hello! How’s it going?", "Hey! Nice to chat!"] },
  { pattern: /^good (morning|afternoon|evening)$/i, response: "Good $1! How can I assist you today?" },
  { pattern: /how are you/i, response: "I’m great, thanks! How are you?" },
  { pattern: /what('s)? up/i, response: "Not much, just here to chat! What’s on your mind?" },
  { pattern: /who are you/i, response: "I’m ECHO AI, your friendly assistant! Here to help and chat." },
  { pattern: /what can you do/i, response: "I can chat, answer simple questions, or tell you a joke! Try me!" },
  { pattern: /tell me a joke/i, response: "Why don’t skeletons fight each other? They don’t have the guts!" },
  { pattern: /bye|goodbye$/i, response: "See you later! Have a great day!" },
  { pattern: /thanks|thank you/i, response: "You’re welcome! Anything else I can do?" },
  { pattern: /weather/i, response: "I can’t check the weather, but I can talk about it! What’s it like where you are?" },
  { pattern: /what time is it/i, response: "I don’t have a clock, but what time is it for you?" },
  { pattern: /how('s)? it going/i, response: "Going great here! You?" },
  { pattern: /what are you doing/i, response: "Chatting with cool people like you!" },
  { pattern: /tell me something/i, response: "Did you know octopuses have three hearts?" },
  { pattern: /do you like music/i, response: "I’d jam if I could!" },
  { pattern: /favorite color/i, response: "I like all colors equally!" },
  { pattern: /are you smart/i, response: "Smart enough to chat with you!" },
  { pattern: /tell me a story/i, response: "Once upon a time, there was a curious user..." },
  { pattern: /yes/i, response: "Great! What’s next?" },
  { pattern: /no/i, response: "Okay, anything else?" },
  { pattern: /maybe/i, response: "Hmm, let’s figure it out!" },
  { pattern: /okay|ok/i, response: "Cool, what’s on your mind?" },
  { pattern: /nice/i, response: "Glad you think so!" },
  { pattern: /wow/i, response: "I know, right?" },
  { pattern: /haha|lol/i, response: "What’s so funny?" },
  { pattern: /cool/i, response: "Totally cool!" },
  { pattern: /sorry/i, response: "No worries at all!" },
  { pattern: /please/i, response: "Of course, what do you need?" },
  { pattern: /what('s)? that/i, response: "What do you mean?" },
  { pattern: /tell me more/i, response: "Sure, what about?" },
  { pattern: /i don('t)? know/i, response: "That’s okay, let’s chat anyway!" },
  { pattern: /great/i, response: "Awesome!" },
  { pattern: /bad/i, response: "Oh no, what happened?" },
  { pattern: /happy/i, response: "Glad to hear that!" },
  { pattern: /sad/i, response: "I’m here for you!" },
  { pattern: /love you/i, response: "Aw, thanks! I’m flattered!" },
  { pattern: /hate you/i, response: "Sorry you feel that way! How can I help?" },
  { pattern: /you('re)? awesome/i, response: "Thanks, you’re pretty great too!" },
  { pattern: /good night/i, response: "Good night! Sweet dreams!" },
  { pattern: /how old are you/i, response: "I’m timeless!" },
  { pattern: /where are you/i, response: "Right here in the cloud!" },
  { pattern: /what('s)? your name/i, response: "I’m ECHO AI!" },
  { pattern: /are you real/i, response: "I’m as real as code gets!" },
  { pattern: /say something funny/i, response: "I told my friend he’s average. He said, ‘That’s mean!’" },
  { pattern: /inspire me/i, response: "You’ve got this! Keep going!" },
  { pattern: /yes please/i, response: "Alright, what do you want?" },
  { pattern: /no thanks/i, response: "No problem, let me know if you change your mind!" },
  { pattern: /what('s)? good/i, response: "Everything’s good here! You?" },
  { pattern: /i('m)? bored/i, response: "Let’s spice things up—tell me a joke or ask me something!" },
  { pattern: /see ya/i, response: "Catch you later!" },
];

const onlineUsers = new Map();

// Socket.io with Optional Token Verification
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("login", async (username) => {
    try {
      const user = await User.findOneAndUpdate(
        { username },
        { online: true, socketId: socket.id, lastLogin: new Date() },
        { upsert: true, new: true }
      );
      onlineUsers.set(user._id.toString(), socket.id);
      const users = await User.find();
      io.emit("userList", users.filter((u) => u.username));
      socket.join(user.username);

      const groups = await Group.find({ members: user._id });
      groups.forEach((group) => {
        socket.join(group._id.toString());
        console.log(`User ${username} joined group ${group._id}`);
      });
    } catch (err) {
      console.error("Login error:", err);
    }
  });

  socket.on("logout", async (username) => {
    try {
      const user = await User.findOneAndUpdate(
        { username },
        { online: false, socketId: null, lastLogin: new Date() },
        { new: true }
      );
      if (user) {
        onlineUsers.delete(user._id.toString());
        io.emit("userDisconnected", { username: user.username, lastLogin: user.lastLogin });
        const users = await User.find();
        io.emit("userList", users.filter((u) => u.username));
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  });

  socket.on("sendMessage", async (msg) => {
    try {
      const message = new Message({ ...msg, timestamp: new Date() });
      await message.save();

      const sender = await User.findOne({ username: msg.sender });
      const receiver = await User.findOne({ username: msg.receiver });

      if (sender && sender.socketId && io.sockets.sockets.get(sender.socketId)) {
        io.to(sender.socketId).emit("message", message);
        console.log(`Emitted message to sender ${sender.username} (socket: ${sender.socketId})`);
      } else {
        console.log(`Sender ${msg.sender} is not connected (no socket)`);
      }

      if (receiver && receiver.socketId && io.sockets.sockets.get(receiver.socketId)) {
        io.to(receiver.socketId).emit("message", message);
        console.log(`Emitted message to receiver ${receiver.username} (socket: ${receiver.socketId})`);
      } else {
        console.log(`Receiver ${msg.receiver} is not connected (no socket)`);
      }
    } catch (err) {
      console.error("Send message error:", err);
    }
  });

  socket.on("sendMessageToChatbot", async (msg) => {
    try {
      const userMessage = new Message({ ...msg, timestamp: new Date() });
      await userMessage.save();

      const sender = await User.findOne({ username: msg.sender });
      if (sender && sender.socketId && io.sockets.sockets.get(sender.socketId)) {
        io.to(sender.socketId).emit("message", userMessage);
        console.log(`Emitted user message to sender ${sender.username} (socket: ${sender.socketId})`);
      } else {
        console.log(`Sender ${msg.sender} is not connected (no socket)`);
      }

      if (!msg.image) {
        let aiResponseContent = "I’m not sure how to respond. Try something else!";
        for (const { pattern, response, responses } of aiResponses) {
          if (pattern.test(msg.content)) {
            aiResponseContent = responses
              ? responses[Math.floor(Math.random() * responses.length)]
              : response.replace("$1", msg.content.match(pattern)[1] || "");
            break;
          }
        }

        const aiResponse = {
          sender: "ECHO AI",
          receiver: msg.sender,
          content: aiResponseContent,
          timestamp: new Date(),
        };
        const savedAIMsg = new Message(aiResponse);
        await savedAIMsg.save();

        if (sender && sender.socketId && io.sockets.sockets.get(sender.socketId)) {
          io.to(sender.socketId).emit("chatbotMessage", savedAIMsg);
          console.log(`Emitted ECHO AI response to ${sender.username} (socket: ${sender.socketId})`);
        } else {
          console.log(`Sender ${msg.sender} is not connected for ECHO AI response (no socket)`);
        }
      }
    } catch (err) {
      console.error("Send message to chatbot error:", err);
    }
  });

  socket.on("sendGroupMessage", async (msg) => {
    try {
      const message = new Message({ ...msg, timestamp: new Date() });
      await message.save();
      console.log(`Sending group message to group ${msg.groupId}:`, message);

      const group = await Group.findById(msg.groupId).populate("members");
      if (group) {
        for (const member of group.members) {
          const userSocket = io.sockets.sockets.get(member.socketId);
          if (userSocket) {
            await User.findByIdAndUpdate(member._id, { socketId: userSocket.id });
            io.to(userSocket.id).emit("groupMessage", message);
            console.log(`Emitted group message to ${member.username} (socket: ${userSocket.id})`);
          } else {
            console.log(`User ${member.username} is not connected (no socket)`);
          }
        }
      } else {
        console.log(`Group ${msg.groupId} not found`);
      }
    } catch (err) {
      console.error("Group message error:", err);
    }
  });

  socket.on("groupNotification", (data) => {
    io.to(data.groupId.toString()).emit("groupNotification", data);
  });

  socket.on("deleteMessage", async ({ msgId, forEveryone }) => {
    try {
      if (forEveryone) {
        const updatedMsg = await Message.findByIdAndUpdate(
          msgId,
          { content: "This message was deleted", image: null, deleted: true },
          { new: true }
        );
        if (updatedMsg.groupId) {
          const group = await Group.findById(updatedMsg.groupId);
          if (group) {
            group.members.forEach(async (memberId) => {
              const member = await User.findById(memberId);
              if (member && member.socketId && io.sockets.sockets.get(member.socketId)) {
                io.to(member.socketId).emit("messageDeletedForEveryone", updatedMsg);
              }
            });
          }
        } else {
          const sender = await User.findOne({ username: updatedMsg.sender });
          const receiver = await User.findOne({ username: updatedMsg.receiver });
          if (sender && sender.socketId && io.sockets.sockets.get(sender.socketId)) {
            io.to(sender.socketId).emit("messageDeletedForEveryone", updatedMsg);
          }
          if (receiver && receiver.socketId && io.sockets.sockets.get(receiver.socketId)) {
            io.to(receiver.socketId).emit("messageDeletedForEveryone", updatedMsg);
          }
        }
      }
    } catch (err) {
      console.error("Delete message error:", err);
    }
  });

  socket.on("editMessage", async ({ _id, content }) => {
    try {
      const updatedMsg = await Message.findByIdAndUpdate(
        _id,
        { content, edited: true },
        { new: true }
      );
      if (updatedMsg.groupId) {
        const group = await Group.findById(updatedMsg.groupId);
        if (group) {
          group.members.forEach(async (memberId) => {
            const member = await User.findById(memberId);
            if (member && member.socketId && io.sockets.sockets.get(member.socketId)) {
              io.to(member.socketId).emit("messageEdited", updatedMsg);
            }
          });
        }
      } else {
        const sender = await User.findOne({ username: updatedMsg.sender });
        const receiver = await User.findOne({ username: updatedMsg.receiver });
        if (sender && sender.socketId && io.sockets.sockets.get(sender.socketId)) {
          io.to(sender.socketId).emit("messageEdited", updatedMsg);
        }
        if (receiver && receiver.socketId && io.sockets.sockets.get(receiver.socketId)) {
          io.to(receiver.socketId).emit("messageEdited", updatedMsg);
        }
      }
    } catch (err) {
      console.error("Edit message error:", err);
    }
  });

  socket.on("markMessageRead", async (msgId) => {
    try {
      const updatedMsg = await Message.findByIdAndUpdate(
        msgId,
        { read: true },
        { new: true }
      );
      const sender = await User.findOne({ username: updatedMsg.sender });
      const receiver = await User.findOne({ username: updatedMsg.receiver });
      if (sender && sender.socketId && io.sockets.sockets.get(sender.socketId)) {
        io.to(sender.socketId).emit("messageRead", updatedMsg);
      }
      if (receiver && receiver.socketId && io.sockets.sockets.get(receiver.socketId)) {
        io.to(receiver.socketId).emit("messageRead", updatedMsg);
      }
      if (updatedMsg.groupId) {
        const group = await Group.findById(updatedMsg.groupId);
        if (group) {
          group.members.forEach(async (memberId) => {
            const member = await User.findById(memberId);
            if (member && member.socketId && io.sockets.sockets.get(member.socketId)) {
              io.to(member.socketId).emit("messageRead", updatedMsg);
            }
          });
        }
      }
    } catch (err) {
      console.error("Mark read error:", err);
    }
  });

  socket.on("typing", async (data) => {
    try {
      console.log(`Server received typing event:`, data);
      if (data.groupId) {
        const group = await Group.findById(data.groupId).populate("members");
        if (group) {
          for (const member of group.members) {
            if (member.username !== data.sender && member.socketId && io.sockets.sockets.get(member.socketId)) {
              io.to(member.socketId).emit("typing", data);
              console.log(`Emitted typing event to ${member.username} (socket: ${member.socketId})`);
            } else if (member.username !== data.sender && !member.socketId) {
              console.log(`User ${member.username} is not connected (no socket)`);
            }
          }
        } else {
          console.log(`Group ${data.groupId} not found`);
        }
      } else {
        const receiver = await User.findOne({ username: data.receiver });
        if (receiver && receiver.socketId && io.sockets.sockets.get(receiver.socketId)) {
          io.to(receiver.socketId).emit("typing", data);
          console.log(`Emitted typing event to ${receiver.username} (socket: ${receiver.socketId})`);
        } else {
          console.log(`Receiver ${data.receiver} is not connected (no socket)`);
        }
      }
    } catch (err) {
      console.error("Typing error:", err);
    }
  });

  socket.on("stopTyping", async (data) => {
    try {
      console.log(`Server received stopTyping event:`, data);
      if (data.groupId) {
        const group = await Group.findById(data.groupId).populate("members");
        if (group) {
          for (const member of group.members) {
            if (member.username !== data.sender && member.socketId && io.sockets.sockets.get(member.socketId)) {
              io.to(member.socketId).emit("stopTyping", data);
              console.log(`Emitted stopTyping event to ${member.username} (socket: ${member.socketId})`);
            } else if (member.username !== data.sender && !member.socketId) {
              console.log(`User ${member.username} is not connected (no socket)`);
            }
          }
        } else {
          console.log(`Group ${data.groupId} not found`);
        }
      } else {
        const receiver = await User.findOne({ username: data.receiver });
        if (receiver && receiver.socketId && io.sockets.sockets.get(receiver.socketId)) {
          io.to(receiver.socketId).emit("stopTyping", data);
          console.log(`Emitted stopTyping event to ${receiver.username} (socket: ${receiver.socketId})`);
        } else {
          console.log(`Receiver ${data.receiver} is not connected (no socket)`);
        }
      }
    } catch (err) {
      console.error("Stop typing error:", err);
    }
  });

  socket.on("disconnect", async () => {
    try {
      const user = await User.findOneAndUpdate(
        { socketId: socket.id },
        { online: false, socketId: null, lastLogin: new Date() },
        { new: true }
      );
      if (user) {
        onlineUsers.delete(user._id.toString());
        io.emit("userDisconnected", { username: user.username, lastLogin: user.lastLogin });
        const users = await User.find();
        io.emit("userList", users.filter((u) => u.username));
      }
      console.log("User disconnected:", socket.id);
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));