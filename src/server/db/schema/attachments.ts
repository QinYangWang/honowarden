import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { ciphers } from "./ciphers";

export const attachments = sqliteTable("attachments", {
  id: text("id").primaryKey(),
  cipherUuid: text("cipher_uuid").notNull().references(() => ciphers.uuid),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  akey: text("akey"),
});
