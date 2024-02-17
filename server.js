if (process.env.NODE_ENV !== "production") require("dotenv").config();
const express = require("express");
const app = express();
const path =require('path');
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { ExpressPeerServer } = require("peer");
const cookie = require("cookie-session");
const passport = require("passport");
const flash = require("express-flash");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const passportAuthenticator = require("./security_functions/passportStrategy");
const user = require("./data_schema/user");
const peerServer = ExpressPeerServer(server, {
    debug: true,
    allow_discovery: true
});
const peerUser = require("./data_schema/peerUser");
const rOOm = require("./data_schema/rOOms");

const videorOOm = require("./team_routes/video");
const signup = require("./team_routes/auth/signup");
const login = require("./team_routes/auth/login");
const logout = require("./team_routes/auth/logout");
const index = require("./team_routes/index");
const newMeeting = require("./team_routes/newMeeting");
const db = process.env.MONGO_URI;


    mongoose.connect('mongodb+srv://Vishesh:@Nitro963@cluster0.khkmhz9.mongodb.net/', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
    })
    .then(() => {
        console.log("database connected");
    })
    .catch((error) => {
        console.log("mongo error",error);
    }); 

//Authenticating password
passportAuthenticator(passport, user);
app.use(express.json());
app.use("/peerjs", peerServer);
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(cookie({ maxAge: 30 * 24 * 60 * 60 * 1000, keys: ["riya"] }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static("public"));
app.use(flash());
app.use(require("express-ejs-layouts"));
app.set("layout", "layouts/layout");
//Join rOOm
app.post("/join-rOOm", (req, res) => {
    res.redirect(`/${req.body.rOOm_id}`);
});
// login
app.use("/login", login);

// signup
app.use("/signup", signup);

// logout
app.use("/logout", logout);

// video rOOm
app.use("/", videorOOm); 

// index route
app.use("/", index);

// user id get
app.get("/user", async (req, res) => {
    res.json({
        user: await peerUser.findOne({ peerId: req.query.peer }).exec(),
    });
});
// new meeting
app.use("/new-meeting", newMeeting);

// login
app.use("/login", login);

// signup
app.use("/signup", signup);

// logout
app.use("/logout", logout);

// video rOOm
app.use("/", videorOOm);

io.on("connection", (socket) => {
    socket.on(
        "join-rOOm",
        async (rOOmId, peerId, userId, name, audio, video) => {
            // add peer details
            await peerUser({
                peerId: peerId,
                name: name,
                audio: audio,
                video: video,
            }).save();
            // add rOOm details
            var rOOmData = await rOOm.findOne({ rOOmId: rOOmId }).exec();
            if (rOOmData == null) {
                await rOOm({
                    rOOmId: rOOmId,
                    userId: userId,
                    count: 1,
                }).save();
                rOOmData = { count: 0 };
            } else if (rOOmData.userId == userId) {
                await rOOm.updateOne(
                    { rOOmId: rOOmId },
                    { count: rOOmData.count + 1 }
                );
            }
            socket.join(rOOmId);
            socket
                .to(rOOmId)
                .emit(
                    "user-connected",
                    peerId,
                    name,
                    audio,
                    video,
                    rOOmData.count + 1
                );
            socket.on("audio-toggle", async (type) => {
                await peerUser.updateOne({ peerId: peerId }, { audio: type });
                socket
                    .to(rOOmId)
                    .emit("user-audio-toggle", peerId, type);
            });
            socket.on("video-toggle", async (type) => {
                await peerUser.updateOne({ peerId: peerId }, { video: type });
                socket
                    .to(rOOmId)
                    .emit("user-video-toggle", peerId, type);
            });
            // chat
            socket.on("client-send", (data) => {
                socket.to(rOOmId).emit("client-podcast", data, name);
            });
            socket.on("disconnect", async () => {
                rOOmData = await rOOm.findOne({ rOOmId: rOOmId }).exec();
                await rOOm.updateOne(
                    { rOOmId: rOOmId },
                    { count: rOOmData.count - 1 }
                );
                // remove peer details
                await peerUser.deleteOne({ peerId: peerId });
                socket
                    .to(rOOmId)
                    .emit(
                        "user-disconnected",
                        peerId,
                        rOOmData.count - 1
                    );
            });
        });           
});
const PORT = process.env.PORT || 5000 ;
server.listen(PORT,()=>{
    console.log(`server started ${PORT}`)
})
