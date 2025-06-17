import WebSocket, { Server } from 'ws';
import path from "path"
import { configDotenv } from 'dotenv';
import { User } from './User';

configDotenv({
  path: path.resolve(__dirname, "../../.env")
})

const wss = new Server({ port: parseInt(process.env.WS_PORT!) });

wss.on('connection', function connection(ws) {
  let user = new User(ws)
  ws.on('error', console.error);
  ws.on('close', () => {
    user.destroy();
  })
});