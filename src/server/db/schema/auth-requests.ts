import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const authRequests = sqliteTable("auth_requests", {
  uuid: text("uuid").primaryKey(),
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  organizationUuid: text("organization_uuid"),
  requestDeviceIdentifier: text("request_device_identifier").notNull(),
  deviceType: integer("device_type").notNull(),
  requestIp: text("request_ip").notNull(),
  responseDeviceId: text("response_device_id"),
  accessCode: text("access_code").notNull(),
  publicKey: text("public_key").notNull(),
  encKey: text("enc_key"),
  masterPasswordHash: text("master_password_hash"),
  approved: integer("approved", { mode: "boolean" }),
  creationDate: integer("creation_date", { mode: "timestamp" }).notNull(),
  responseDate: integer("response_date", { mode: "timestamp" }),
  authenticationDate: integer("authentication_date", { mode: "timestamp" }),
});
