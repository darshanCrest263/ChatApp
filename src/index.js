const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const app = express();
const port = process.env.PORT || 3000;
const publicDirPath = path.join(__dirname, "../public");

const server = http.createServer(app);
const io = socketio(server);
let message = "Welcome";

io.on("connection", (socket) => {
  socket.on("join", ({ username, roomname }, callback) => {
    const { error, user } = addUser({
      id: socket.id,
      username: username,
      room: roomname,
    });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    socket.emit("message", generateMessage("Admin", message));

    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined the chat!`)
      );
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
    callback();
  });

  socket.on("sendMessage", (m, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      return alert("Not valid operation");
    }
    const filter = new Filter();
    if (filter.isProfane(m)) {
      return callback("Profanity is not allowed!");
    }
    io.to(user.room).emit("message", generateMessage(user.username, m));
    callback();
  });

  socket.on("sendLocation", (location, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      return alert("Not valid operation!");
    }

    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://www.google.com/maps?q=${location.latitude},${location.logitude}`
      )
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    console.log(user);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `A ${user.username} has left!`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});
app.use(express.static(publicDirPath));

server.listen(port, () => {
  console.log("Server is live.");
});
