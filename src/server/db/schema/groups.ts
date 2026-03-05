import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { organizations, usersOrganizations } from "./organizations";
import { collections } from "./collections";

export const groups = sqliteTable("groups", {
  uuid: text("uuid").primaryKey(),
  organizationsUuid: text("organizations_uuid").notNull().references(() => organizations.uuid),
  name: text("name").notNull(),
  accessAll: integer("access_all", { mode: "boolean" }).notNull().default(false),
  externalId: text("external_id"),
  creationDate: integer("creation_date", { mode: "timestamp" }).notNull(),
  revisionDate: integer("revision_date", { mode: "timestamp" }).notNull(),
});

export const groupsUsers = sqliteTable("groups_users", {
  groupsUuid: text("groups_uuid").notNull().references(() => groups.uuid),
  usersOrganizationsUuid: text("users_organizations_uuid").notNull()
    .references(() => usersOrganizations.uuid),
}, (table) => [
  primaryKey({ columns: [table.groupsUuid, table.usersOrganizationsUuid] }),
]);

export const collectionsGroups = sqliteTable("collections_groups", {
  collectionsUuid: text("collections_uuid").notNull().references(() => collections.uuid),
  groupsUuid: text("groups_uuid").notNull().references(() => groups.uuid),
  readOnly: integer("read_only", { mode: "boolean" }).notNull().default(false),
  hidePasswords: integer("hide_passwords", { mode: "boolean" }).notNull().default(false),
  manage: integer("manage", { mode: "boolean" }).notNull().default(false),
}, (table) => [
  primaryKey({ columns: [table.collectionsUuid, table.groupsUuid] }),
]);
