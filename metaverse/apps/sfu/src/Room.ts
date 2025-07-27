import { Server } from "socket.io";
import config from "./config";
import { Peer } from "./Peer";
import { DtlsParameters, MediaKind, Router, RtpCapabilities, RtpParameters, Worker } from "mediasoup/types";

export class Room {
    peers: Map<string, Peer>;
    roomId;
    private router: Router;
    private io: Server;
    constructor(roomId: string, router: Router, io: Server) {
        this.roomId = roomId;
        this.peers = new Map<string, Peer>();
        this.io = io;
        this.router = router;
    }
    static async init(roomId: string, worker: Worker, io: Server): Promise<Room> {
        const router = await worker.createRouter({
            mediaCodecs: config.mediasoup.router.mediaCodecs
        })
        return new Room(roomId, router, io);
    }
    async createWebRtcTransport(socket_id: string) {
        const { maxIncomingBitrate, initialAvailableOutgoingBitrate } = config.mediasoup.webRtcTransport
        const transport = await this.router.createWebRtcTransport({
            listenIps: config.mediasoup.webRtcTransport.listenIps,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate,
        });
        if (maxIncomingBitrate) {
            try {
                await transport.setMaxIncomingBitrate(maxIncomingBitrate);
            } catch (error) { }
        }
        transport.on(
            'dtlsstatechange', (dtlsState) => {
                if (dtlsState === 'closed') {
                    transport.close();
                }
            }
        )
        transport.on('@close', () => {
            console.log("Transport closed ", {
                name: this.peers.get(socket_id)?.peerName,
            })
        });
        this.peers.get(socket_id)?.addTransPort(transport);
        return transport
    }
    async connectPeerTransport(socket_id: string, transport_id: string, dtlsParameters: DtlsParameters) {
        if (!this.peers.has(socket_id)) return
        await this.peers.get(socket_id)!.connectTransport(transport_id, dtlsParameters)
    }
    async produce(socket_id: string, producerTransport_id: string, rtpParameters: RtpParameters, kind: MediaKind) {
        if (!this.peers.get(socket_id))
            return;
        const producer = await this.peers.get(socket_id)?.createProducer(producerTransport_id, rtpParameters, kind);
        if (!producer) return;
        this.broadcast(socket_id, 'newProducers',
            {
                'producer_id': producer!.id,
                'producer_socket_id': socket_id
            }
        );
        return producer!.id;
    }
    async consume(socket_id: string, consumerTransport_id: string, producer_id: string, rtpCapabilities: RtpCapabilities) {
        if (
            !this.router.canConsume({
                producerId: producer_id,
                rtpCapabilities
            })
        ) {
            console.error("Cannot consume this producer")
            return;
        }
        let consumerR = await this.peers.get(socket_id)?.createConsumer(consumerTransport_id, producer_id, rtpCapabilities);
        if(!consumerR) return;
        consumerR.consumer.on('@producerclose', ()=> {
            this.peers.get(socket_id)?.removeConsumer(consumerR.consumer.id)
            this.io.to(socket_id).emit('consumerClosed', {
                consumer_id: consumerR.consumer.id
            })
        })
        return consumerR.params;

    }
    closeProducer(socket_id: string, producer_id: string) {
        this.peers.get(socket_id)?.closeProducer(producer_id);
    }
    getProducerList() {
        let producerList = [{}];
        this.peers.forEach((peer) => {
            peer.producers.forEach((producer) => {
                producerList.push({
                    producer_id: producer.id
                })
            })
        })
        return producerList;
    }
    broadcast(socket_id: string, event: string, data: Object) {
        for (let id of Array.from((this.peers.keys())).filter((id) => id !== socket_id)) {
            this.send(id, data, event);
        }
    }
    send(socket_id: string, data: Object, event: string) {
        this.io.to(socket_id).emit(event, data);
    }
    addPeer(peer: Peer) {
        this.peers.set(peer.peerId, peer);
    }
    async removePeer(socket_id: string) {
        this.peers.get(socket_id)?.closeAll();
        this.peers.delete(socket_id);
    }
    getPeers() {
        return this.peers
    }
}