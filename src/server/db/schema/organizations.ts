import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const organizations = sqliteTable("organizations", {
  uuid: text("uuid").primaryKey(),
  name: text("name").notNull(),
  billingEmail: text("billing_email").notNull(),
  privateKey: text("private_key"),
  publicKey: text("public_key"),
});

export const usersOrganizations = sqliteTable("users_organizations", {
  uuid: text("uuid").primaryKey(),
  userUuid: text("user_uuid").notNull().references(() => users.uuid),
  orgUuid: text("org_uuid").notNull().references(() => organizations.uuid),
  invitedByEmail: text("invited_by_email"),
  accessAll: integer("access_all", { mode: "boolean" }).notNull().default(false),
  akey: text("akey").notNull().default(""),
  status: integer("status").notNull(),
  atype: integer("atype").notNull(),
  resetPasswordKey: text("reset_password_key"),
  externalId: text("external_id"),
}, (table) => [
  index("idx_users_orgs_user").on(table.userUuid),
  index("idx_users_orgs_org").on(table.orgUuid),
]);

export const organizationApiKey = sqliteTable("organization_api_key", {
  uuid: text("uuid").notNull(),
  orgUuid: text("org_uuid").notNull().references(() => organizations.uuid),
  atype: integer("atype").notNull(),
  apiKey: text("api_key").notNull(),
  revisionDate: integer("revision_date", { mode: "timestamp" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.uuid, table.orgUuid] }),
]);
