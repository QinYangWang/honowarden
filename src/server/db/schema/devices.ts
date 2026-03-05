import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const devices = sqliteTable("devices", {
  uuid: text("uuid").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  name: text("name").notNull(),
  atype: integer("atype").notNull(),
  pushUuid: text("push_uuid"),
  pushToken: text("push_token"),
  refreshToken: text("refresh_token").notNull(),
  twofactorRemember: text("twofactor_remember"),
}, (table) => [
  primaryKey({ columns: [table.uuid, table.userUuid] }),
  index("idx_devices_user_uuid").on(table.userUuid),
  index("idx_devices_refresh_token").on(table.refreshToken),
]);
