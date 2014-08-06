var app = null;

exports.connection = function (req) {
    req.io.emit('talk', {
        message: 'io event from an io route on the server',
        user: req.session
    });
    console.log("socket.id:", req.session.id, "-", req.socket.id);
};

exports.onJoinRoom = function(req) {
  //console.log("Join Room", req.data, ":", req.session.id, "-", req.socket.id);
  req.io.join(req.data);
};

exports.onLeaveRoom = function(req) {
  //console.log("Join Room", req.data, ":", req.session.id, "-", req.socket.id);
  req.io.leave(req.data);
};

exports.initialize = function(opts) {
    app = opts.app;
};
