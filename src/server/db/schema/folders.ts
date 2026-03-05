import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { ciphers } from "./ciphers";

export const folders = sqliteTable("folders", {
  uuid: text("uuid").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  name: text("name").notNull(),
});

export const foldersCiphers = sqliteTable("folders_ciphers", {
  cipherUuid: text("cipher_uuid").notNull().references(() => ciphers.uuid),
  folderUuid: text("folder_uuid").notNull().references(() => folders.uuid),
}, (table) => [
  primaryKey({ columns: [table.cipherUuid, table.folderUuid] }),
]);
