import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const event = sqliteTable("event", {
  uuid: text("uuid").primaryKey(),
  eventType: integer("event_type").notNull(),
  userUuid: text("user_uuid"),
  orgUuid: text("org_uuid"),
  cipherUuid: text("cipher_uuid"),
  collectionUuid: text("collection_uuid"),
  groupUuid: text("group_uuid"),
  orgUserUuid: text("org_user_uuid"),
  actUserUuid: text("act_user_uuid"),
  deviceType: integer("device_type"),
  ipAddress: text("ip_address"),
  eventDate: integer("event_date", { mode: "timestamp" }).notNull(),
  policyUuid: text("policy_uuid"),
  providerUuid: text("provider_uuid"),
  providerUserUuid: text("provider_user_uuid"),
  providerOrgUuid: text("provider_org_uuid"),
}, (table) => [
  index("idx_event_date").on(table.eventDate),
  index("idx_event_org_uuid").on(table.orgUuid),
]);
