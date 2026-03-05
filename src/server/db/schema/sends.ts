import { sqliteTable, text, integer, blob, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { organizations } from "./organizations";

export const sends = sqliteTable("sends", {
  uuid: text("uuid").primaryKey(),
  userUuid: text("user_uuid").references(() => users.uuid),
  organizationUuid: text("organization_uuid").references(() => organizations.uuid),
  name: text("name").notNull(),
  notes: text("notes"),
  atype: integer("atype").notNull(),
  data: text("data").notNull(),
  akey: text("akey").notNull(),
  passwordHash: blob("password_hash", { mode: "buffer" }),
  passwordSalt: blob("password_salt", { mode: "buffer" }),
  passwordIter: integer("password_iter"),
  maxAccessCount: integer("max_access_count"),
  accessCount: integer("access_count").notNull().default(0),
  creationDate: integer("creation_date", { mode: "timestamp" }).notNull(),
  revisionDate: integer("revision_date", { mode: "timestamp" }).notNull(),
  expirationDate: integer("expiration_date", { mode: "timestamp" }),
  deletionDate: integer("deletion_date", { mode: "timestamp" }).notNull(),
  disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
  hideEmail: integer("hide_email", { mode: "boolean" }),
}, (table) => [
  index("idx_sends_user_uuid").on(table.userUuid),
  index("idx_sends_deletion_date").on(table.deletionDate),
]);
