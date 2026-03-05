import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const twofactor = sqliteTable("twofactor", {
  uuid: text("uuid").primaryKey(),
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  atype: integer("atype").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  data: text("data").notNull(),
  lastUsed: integer("last_used").notNull().default(0),
}, (table) => [
  index("idx_twofactor_user").on(table.userUuid),
]);

export const twofactorIncomplete = sqliteTable("twofactor_incomplete", {
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  deviceUuid: text("device_uuid").notNull(),
  deviceName: text("device_name").notNull(),
  deviceType: integer("device_type").notNull(),
  loginTime: integer("login_time", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address").notNull(),
}, (table) => [
  primaryKey({ columns: [table.userUuid, table.deviceUuid] }),
]);

export const twofactorDuoCtx = sqliteTable("twofactor_duo_ctx", {
  state: text("state").primaryKey(),
  userEmail: text("user_email").notNull(),
  nonce: text("nonce").notNull(),
  exp: integer("exp").notNull(),
});
