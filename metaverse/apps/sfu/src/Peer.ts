import { Consumer, ConsumerType, DtlsParameters, MediaKind, Producer, RtpCapabilities, RtpParameters, WebRtcTransport } from "mediasoup/types";

export class Peer {
    private socket_id;
    private peerId;
    private transports: Map<string, WebRtcTransport>;
    private consumers: Map<string, Consumer>;
    private producers: Map<string, Producer>;
    constructor(socket_id: string, peerId: string) {
        this.socket_id = socket_id
        this.peerId = peerId
        this.transports = new Map()
        this.consumers = new Map()
        this.producers = new Map()
    }
    addTransPort(transport: WebRtcTransport): void {
        this.transports.set(transport.id, transport);
    }
    async connectTransport(transport_id: string, dtlsParameters: DtlsParameters): Promise<void> {
        if (!this.transports.has(transport_id))
            return;
        return await this.transports.get(transport_id)?.connect({ dtlsParameters });
    }
    async createProducer(transport_id: string, rtpParameters: RtpParameters, kind: MediaKind): Promise<Producer | undefined> {
        const transport = this.transports.get(transport_id);
        if (!transport)
            return;
        const producer = await transport.produce({
            rtpParameters,
            kind
        })
        this.producers.set(producer.id, producer);
        //onclose
        producer.on('transportclose', () => {
            console.log('Producer transport close', { peerId: `${this.peerId}`, consumer_id: `${producer.id}` })
            this.producers.delete(producer.id);
            // producer.close()
        });
        return producer;
    }
    async createConsumer(transport_id: string, producer_id: string, rtpCapabilities: RtpCapabilities): Promise<{
        consumer: Consumer;
        params: {
            producerId: string;
            id: string;
            kind: MediaKind;
            rtpParameters: RtpParameters;
            type: ConsumerType;
            producerPaused: boolean;
        };
    } | undefined> {
        const transport = this.transports.get(transport_id);
        if (!transport) return;
        let consumer: Consumer | null = null;
        try {
            consumer = await transport.consume({
                producerId: producer_id,
                rtpCapabilities,
                paused: false
            });
        } catch (error) {
            console.error("Conusme error", error);
            return;
        }
        if (consumer.type === 'simulcast') {
            await consumer.setPreferredLayers({
                spatialLayer: 2,
                temporalLayer: 2
            })
        }
        this.consumers.set(consumer.id, consumer);
        consumer.on('transportclose', () => {
            console.log('Consumer transport closed', {
                peerId: this.peerId,
                consumerId: consumer.id,

            });
            this.consumers.delete(consumer.id);
        })
        return {
            consumer,
            params: {
                producerId: producer_id,
                id: consumer.id,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
                type: consumer.type,
                producerPaused: consumer.producerPaused
            }
        }
    }
    closeProducer(producer_id: string): void {
        try {
            this.producers.get(producer_id)?.close()
        } catch (e) {
            console.error(e);
        }
        this.producers.delete(producer_id)
    }
    getTransport(transport_id: string): WebRtcTransport | void {
        return this.transports.get(transport_id);
    }
    getConsumer(consumer_id: string): Consumer | undefined {
        return this.consumers.get(consumer_id);
    }
    getProducer(producer_id: string): Producer | undefined {
        return this.producers.get(producer_id);
    }
    closeAll() {
        this.transports.forEach((transport) => { transport.close })
        return
    }
    removeConsumer(consumer_id: string) {
        this.consumers.delete(consumer_id);
    }
}