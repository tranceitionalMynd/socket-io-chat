var express=require("express"),
    x_app=express(),
    http_server=require("http").createServer(x_app),
    socket_io=require("socket.io").listen(http_server),
    chalk=require("chalk");

var User = function(nickname, socket) {
    this.nickname = nickname;
    this.socket = socket;
}

var users = {};

var success = chalk.green,
    error = chalk.red;
var port = process.env.PORT || 8080;

x_app.use(express.static(__dirname + "/public"));
x_app.set("view engine", "ejs");

x_app.get("/", function(request, result) { result.render("index"); });

socket_io.on("connection", function(socket) {
    console.log(success("New connection."));
    socket.on("new-user", function(nickname, next) {
        if (nickname in users) {
            console.log(error("Nickname '" + nickname + "' is already taken."))
            next(false);
            return;
        }
        console.log(success("Nickname '" + nickname + "' is entering the chat room."));
        next(true);
        socket.nickname = nickname;
        users[nickname] = new User(nickname, socket);
        updateNicknames();
    });
    socket.on("send-message", function(message, next) {
        message = message.trim();
        if (message.substr(0,1) == "@") {
            var index = message.indexOf(' ');
            if (index == -1) {
                next("You forgot to write the private message.");
                return
            }
            // Send a private message
            nickname = message.substr(1, index - 1);
            if (! nickname in users || ! users[nickname]) { 
                next("User '" + nickname + "' is not online.");
                return;
            }
            message = message.substr(index+1, message.length - index -1);
            user = users[nickname];
            user.socket.emit("new-message", {msg:message,nick:socket.nickname,private:true});
            socket.emit("new-message", {msg:message,nick:socket.nickname,at:nickname,private:true});
            return;
        }
        console.log("Got message :" + message);
        socket_io.sockets.emit("new-message", {msg:message,nick:socket.nickname});
    });
    socket.on("disconnect", function(data) {
        delete users[socket.nickname];
        updateNicknames();
    });
});

function updateNicknames() {
    socket_io.sockets.emit('usernames', Object.keys(users));
}

http_server.listen(port);
console.log(success("Listening on: " + port));
