import { WebSocket } from "ws";
import { RoomManager } from "./RoomManager";
import { verify, JwtPayload } from "jsonwebtoken";
import { OutgoingMessage } from "./types";
import { HEIGHT, WIDTH } from "./constants";
import client from "@repo/db/client"

const generateID = () => {
    const charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789_*";
    let id = "";
    for (let i = 0; i < 10; i++) {
        let randomIdx = Math.floor(Math.random() * charSet.length);
        id += charSet.charAt(randomIdx)
    }
    return id
}

const isColliding = (spaceId: string, user: User) => {
    const roomUsers = RoomManager.getInstance().rooms.get(spaceId);
    let flag: boolean = true;
    if (roomUsers) {
        for (const u of roomUsers) {
            // condition for collision b/w 2 users
            if (Math.abs(u.x - user.x) < WIDTH && Math.abs(u.y - user.y) < HEIGHT) {
                flag = false;
                break;
            }
        }
    }
    return flag;
}

export class User {
    private ws: WebSocket
    public x: number
    public y: number
    public id: string
    private userId?: string
    public spaceId?: string
    constructor(ws: WebSocket,) {
        this.ws = ws;
        this.x = 0;
        this.y = 0;
        this.id = generateID();
        this.initHandlers()
    }
    initHandlers() {
        this.ws.on("message", async (data) => {
            const parsedData = JSON.parse(data.toString());
            switch (parsedData.type) {
                case "join":
                    const { spaceId, token } = parsedData.payload
                    const userId = (verify(token, process.env.JWT_SECRET as string) as JwtPayload).userId;
                    if (!userId) {
                        console.log("User is not verified")
                        this.ws.close();
                        break;
                    }
                    this.userId = userId;
                    const space = await client.space.findUnique({
                        where: {
                            id: spaceId
                        }
                    });
                    if (!space) {
                        console.log("Space or user was not found");
                        this.ws.close();
                        break;
                    }
                    this.spaceId = space.id,
                        RoomManager.getInstance().addUser(spaceId, this);
                    this.x = Math.floor(Math.random() * space.width);
                    this.y = Math.floor(Math.random() * space.height);
                    while (true) {
                        if (!isColliding(spaceId, this)) break;
                        this.x = Math.floor(Math.random() * space.width);
                        this.y = Math.floor(Math.random() * space.height);
                    }
                    // we need to add a media produce logic here
                    this.send({
                        type: "space-joined",
                        payload: {
                            spawn: {
                                x: this.x,
                                y: this.y
                            },
                            users: RoomManager.getInstance().rooms.get(spaceId)?.filter(x => x.id !== this.id)?.map((u) => ({ id: u.id })) ?? []
                        }
                    })
                    RoomManager.getInstance().broadcast(
                        {
                            type: "user-joined",
                            payload: {
                                userId: this.userId,
                                x: this.x,
                                y: this.y
                            }
                        }, this, this.spaceId!)
                    break;
                case "move":
                    const newX = parsedData.payload.x
                    const newY = parsedData.payload.y
                    const xD = Math.abs(this.x - newX);
                    const yD = Math.abs(this.y - newY);
                    // check wether this movement is valid
                    let isMovementValid = !isColliding(this.spaceId!, this) && ((xD == 1 && yD == 0) || (xD == 0 && yD == 1))
                    if (isMovementValid) {
                        this.x = newX
                        this.y = newY;
                        RoomManager.getInstance().broadcast({
                            type: "movement",
                            payload: {
                                x: this.x,
                                y: this.y,
                                userId: this.userId
                            }
                        }, this, this.spaceId!)
                    }
                    else {
                        this.send({
                            type : "movement-rejected",
                            payload: {
                                x: this.x,
                                y: this.y
                            }
                        })
                    }
                    break;
            }
        })
    }
    destroy(){
        RoomManager.getInstance().broadcast({
            type: "user-left",
            payload: {
                userId: this.userId
            }
        }, this, this.spaceId!);
        RoomManager.getInstance().removeUser(this.spaceId!, this);
    }
    public send(payload: OutgoingMessage) {
        this.ws.send(JSON.stringify(payload))
    }
}