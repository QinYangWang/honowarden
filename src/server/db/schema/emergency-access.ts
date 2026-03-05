import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const emergencyAccess = sqliteTable("emergency_access", {
  uuid: text("uuid").primaryKey(),
  grantorUuid: text("grantor_uuid").notNull().references(() => users.uuid),
  granteeUuid: text("grantee_uuid").references(() => users.uuid),
  email: text("email"),
  keyEncrypted: text("key_encrypted"),
  atype: integer("atype").notNull(),
  status: integer("status").notNull(),
  waitTimeDays: integer("wait_time_days").notNull(),
  recoveryInitiatedAt: integer("recovery_initiated_at", { mode: "timestamp" }),
  lastNotificationAt: integer("last_notification_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("idx_emergency_grantor").on(table.grantorUuid),
  index("idx_emergency_grantee").on(table.granteeUuid),
  index("idx_emergency_status").on(table.status),
]);
