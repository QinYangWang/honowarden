export interface Env {
  // D1
  DB: D1Database;

  // R2
  ATTACHMENTS: R2Bucket;
  SENDS: R2Bucket;
  ICONS: R2Bucket;

  // KV
  CONFIG: KVNamespace;
  RATE_LIMIT: KVNamespace;

  // Durable Objects
  USER_HUB: DurableObjectNamespace;
  ANON_HUB: DurableObjectNamespace;

  // Queues
  EMAIL_QUEUE: Queue;
  PUSH_QUEUE: Queue;
  EVENT_QUEUE: Queue;

  // Secrets
  RSA_PRIVATE_KEY: string;
  ADMIN_TOKEN: string;
  RESEND_API_KEY: string;
  DOMAIN: string;

  // Optional Secrets
  DUO_IKEY?: string;
  DUO_SKEY?: string;
  DUO_HOST?: string;
  YUBICO_CLIENT_ID?: string;
  YUBICO_SECRET_KEY?: string;
  PUSH_INSTALLATION_ID?: string;
  PUSH_INSTALLATION_KEY?: string;
}
