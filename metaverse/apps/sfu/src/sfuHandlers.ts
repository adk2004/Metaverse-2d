import { Server } from "socket.io";
import { Room } from "./Room";
import config from "./config";
import mediasoup from "mediasoup"
import { Worker } from "mediasoup/types";
import { Peer } from "./Peer";
import { SocketWithRoom } from "./types";

let nxtIdx = 0;
let rooms = new Map<string, Room>();
let workers: Worker[] = [];

const createWorkers = async () => {
    for (let i = 0; i < config.mediasoup.numWorkers; i++) {
        let worker = await mediasoup.createWorker(config.mediasoup.worker)
        worker.on('died', () => {
            console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid)
            setTimeout(() => process.exit(1), 2000)
        })
        workers.push(worker);
    }
}

(async () => {
    await createWorkers();
})();


const getWorker = () => {
    const worker = workers[nxtIdx];
    if (++nxtIdx === workers.length) nxtIdx = 0;
    return worker;
}

export const handler = (socket: SocketWithRoom, io: Server) => {
    socket.on('createRoom', async ({ room_id }, cb) => {
        if (rooms.has(room_id)) {
            return cb('already exists');
        } else {
            let worker = getWorker();
            rooms.set(room_id, await Room.init(room_id, worker, io));
        }
    });
    socket.on('join', ({ room_id, name }, cb) => {
        if (!rooms.has(room_id)) {
            return cb({
                error: 'Room does not exist'
            })
        }
        rooms.get(room_id)?.addPeer(new Peer(socket.id, name))
        socket.room_id = room_id
        cb({
            room_id: rooms.get(room_id)!.roomId,
            peers: JSON.stringify([...(rooms.get(room_id)!.peers)])
        });
    })
    socket.on('getProducers', (_, cb) => {
        if (!rooms.has(socket.room_id!)) {
            return cb({
                error: 'Room does not exist'
            })
        }
        return cb({
            producers: JSON.stringify([...rooms.get(socket.room_id!)!.getProducerList()])
        });
    });
    socket.on('createTransport', async (_, cb) => {
        try {
            const transport = await rooms.get(socket.room_id!)!.createWebRtcTransport(socket.id);
            cb({ transport });
        } catch (err: any) {
            console.error(err)
            cb({
                error: err.message
            })
        }
    })
}