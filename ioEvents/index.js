var config,
    jwt = require('jsonwebtoken');

exports.connection = function (socket, data) {
  var token = null;
  if ("user" in socket.session) {
    token = jwt.sign({ user: socket.session.user.id, mobile: false }, config.get("privateKey"), { expiresInMinutes: 60, algorithm: 'RS256' });
  }
  socket.emit('talk', {
    message: 'io event from an io route on the server',
    objectType: "user-info",
    user: socket.session,
    token: token
  });
};

exports.onJoinRoom = function(socket, data) {
  console.log("Join Room", data);
  socket.join(data);
};

exports.onLeaveRoom = function(socket, data) {
  //console.log("Join Room", req.data, ":", req.session.id, "-", req.socket.id);
  socket.leave(data);
};

exports.refreshToken = function (socket, data) {
  var token = jwt.sign({ user: socket.session.user.id }, config.get("privateKey"), { expiresInMinutes: 60, algorithm: 'RS256' });
  socket.emit('talk', {
    token: token
  });
};

exports.initialize = function(options) {
    config = options;
};
