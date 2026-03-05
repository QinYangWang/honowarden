import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const invitations = sqliteTable("invitations", {
  email: text("email").primaryKey(),
});
