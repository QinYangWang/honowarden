import { DurableObject } from "cloudflare:workers";
import { encode } from "@msgpack/msgpack";

export class UserNotificationHub extends DurableObject {
  private sessions: Map<WebSocket, { userId: string; deviceId: string }> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/negotiate") {
      return Response.json({
        connectionId: crypto.randomUUID(),
        availableTransports: [
          { transport: "WebSockets", transferFormats: ["Binary"] },
        ],
      });
    }

    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const userId = url.searchParams.get("userId") || "";
    const deviceId = url.searchParams.get("deviceId") || "";

    this.ctx.acceptWebSocket(server);
    this.sessions.set(server, { userId, deviceId });

    const handshakeResponse = encode({ protocol: "messagepack", version: 1 });
    const frame = this.lengthPrefix(new Uint8Array(handshakeResponse));
    server.send(frame);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    // Handle ping
    if (message instanceof ArrayBuffer && message.byteLength > 0) {
      const view = new Uint8Array(message);
      // Respond to client pings
      const pingResponse = encode([6]);
      ws.send(this.lengthPrefix(new Uint8Array(pingResponse)));
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.sessions.delete(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.sessions.delete(ws);
  }

  async sendNotification(targetUserId: string, payload: unknown): Promise<void> {
    const message = [1, {}, null, "ReceiveMessage", [payload]];
    const encoded = encode(message);
    const frame = this.lengthPrefix(new Uint8Array(encoded));

    for (const [ws, session] of this.sessions) {
      if (session.userId === targetUserId) {
        try {
          ws.send(frame);
        } catch {
          this.sessions.delete(ws);
        }
      }
    }
  }

  async broadcast(payload: unknown): Promise<void> {
    const message = [1, {}, null, "ReceiveMessage", [payload]];
    const encoded = encode(message);
    const frame = this.lengthPrefix(new Uint8Array(encoded));

    for (const [ws] of this.sessions) {
      try {
        ws.send(frame);
      } catch {
        this.sessions.delete(ws);
      }
    }
  }

  private lengthPrefix(data: Uint8Array): ArrayBuffer {
    const len = data.length;
    const header: number[] = [];
    let remaining = len;

    do {
      let byte = remaining & 0x7f;
      remaining >>= 7;
      if (remaining > 0) byte |= 0x80;
      header.push(byte);
    } while (remaining > 0);

    const result = new Uint8Array(header.length + data.length);
    result.set(header);
    result.set(data, header.length);
    return result.buffer;
  }
}
