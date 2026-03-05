import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { organizations } from "./organizations";
import { collections } from "./collections";

export const ciphers = sqliteTable("ciphers", {
  uuid: text("uuid").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  userUuid: text("user_uuid").references(() => users.uuid),
  organizationUuid: text("organization_uuid").references(() => organizations.uuid),
  key: text("key"),
  atype: integer("atype").notNull(),
  name: text("name").notNull(),
  notes: text("notes"),
  fields: text("fields"),
  data: text("data").notNull(),
  passwordHistory: text("password_history"),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  reprompt: integer("reprompt"),
}, (table) => [
  index("idx_ciphers_user_uuid").on(table.userUuid),
  index("idx_ciphers_org_uuid").on(table.organizationUuid),
  index("idx_ciphers_deleted_at").on(table.deletedAt),
]);

export const ciphersCollections = sqliteTable("ciphers_collections", {
  cipherUuid: text("cipher_uuid").notNull().references(() => ciphers.uuid),
  collectionUuid: text("collection_uuid").notNull().references(() => collections.uuid),
}, (table) => [
  primaryKey({ columns: [table.cipherUuid, table.collectionUuid] }),
]);
