import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const collections = sqliteTable("collections", {
  uuid: text("uuid").primaryKey(),
  orgUuid: text("org_uuid").notNull().references(() => organizations.uuid),
  name: text("name").notNull(),
  externalId: text("external_id"),
});

export const usersCollections = sqliteTable("users_collections", {
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  collectionUuid: text("collection_uuid").notNull().references(() => collections.uuid),
  readOnly: integer("read_only", { mode: "boolean" }).notNull().default(false),
  hidePasswords: integer("hide_passwords", { mode: "boolean" }).notNull().default(false),
  manage: integer("manage", { mode: "boolean" }).notNull().default(false),
}, (table) => [
  primaryKey({ columns: [table.userUuid, table.collectionUuid] }),
]);
