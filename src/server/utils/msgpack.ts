import { encode } from "@msgpack/msgpack";

export function encodeNotificationFrame(payload: unknown): ArrayBuffer {
  const message = [1, {}, null, "ReceiveMessage", [payload]];
  const encoded = encode(message);
  return lengthPrefix(encoded);
}

export function encodePingFrame(): ArrayBuffer {
  const encoded = encode([6]);
  return lengthPrefix(encoded);
}

function lengthPrefix(data: Uint8Array): ArrayBuffer {
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
