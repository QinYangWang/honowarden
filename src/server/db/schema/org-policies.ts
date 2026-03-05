import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { organizations } from "./organizations";

export const orgPolicies = sqliteTable("org_policies", {
  uuid: text("uuid").primaryKey(),
  orgUuid: text("org_uuid").notNull().references(() => organizations.uuid),
  atype: integer("atype").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  data: text("data").notNull().default("{}"),
});
