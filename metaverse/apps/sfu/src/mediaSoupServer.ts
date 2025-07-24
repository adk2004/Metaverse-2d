import express from "express";
import { Server } from "socket.io";
import mediasoup, { createWorker } from "mediasoup"
import config from "./config";
import { Room } from "./Room";
import { Peer } from "./Peer";
import http from 'http';

const app = express();
let workers = [];
let nxtIdx= 0;
let rooms = new Map<string,Room>();

const createWorkers = async() =>{
    for(let i = 0;i< config.mediasoup.numWorkers;i++){
        let worker = await mediasoup.createWorker(config.mediasoup.worker)
        worker.on('died', () => {
            console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid)
            setTimeout(() => process.exit(1), 2000)
        })
        workers.push(worker);
    }
}

const server = http.createServer(app);
const io = new Server(server);

server.listen(config.listenPort, async() => {
    await createWorkers();
    console.log("Mediasoup server started on port " + config.listenPort);
})

