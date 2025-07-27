import express from "express";
import { Server } from "socket.io";
import config from "./config";
import http from 'http';
import { handler } from "./sfuHandlers";

export const app = express();

const server = http.createServer(app);
const io = new Server(server);

io.on("connection",(socket) => {
    handler(socket,io);
});

server.listen(config.listenPort, async() => {
    console.log("Mediasoup server started on port " + config.listenPort);
})

