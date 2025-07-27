import { Socket } from "socket.io";

export interface SocketWithRoom extends Socket {
    room_id?: string;
}
