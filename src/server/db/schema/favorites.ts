import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { ciphers } from "./ciphers";

export const favorites = sqliteTable("favorites", {
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  cipherUuid: text("cipher_uuid").notNull().references(() => ciphers.uuid),
}, (table) => [
  primaryKey({ columns: [table.userUuid, table.cipherUuid] }),
]);
