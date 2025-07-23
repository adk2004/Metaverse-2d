import { MediaKind } from "mediasoup/types";
import os, { networkInterfaces } from "os";

const getLocalIp = (): string => {
    let ip = '127.0.0.1'
    const nets = networkInterfaces();
    Object.keys(nets).forEach((ifname) => {
        for (const iface of nets[ifname]!) {
            if (iface.family !== 'IPv4' || iface.internal !== false) continue
            ip = iface.address
            return;
        }
    })
    return ip
}

export default {
    listenIp: '0.0.0.0',
    listenPort: 5001,
    mediasoup: {
        numWorkers: Object.keys(os.cpus).length,
        worker: {
            rtcMinPort: 9000,
            rtcMaxPort: 9501,
            loglevel: 'warn',
            logTags: [
                'info',
                'ice',
                'dtls',
                'rtp',
                'srtp',
                'rtcp',
                'simulcast',
            ]
        },
        router: {
            mediaCodecs: [
                {
                    kind: 'audio' as MediaKind,
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2
                },
                {
                    kind: 'video' as MediaKind,
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000
                    }
                }
            ]
        },
        webRtcTransport: {
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: getLocalIp(),
                }
            ],
            maxIncomingBitrate: 1500000,
            initialAvailableOutgoingBitrate: 1000000
        }
    }
}