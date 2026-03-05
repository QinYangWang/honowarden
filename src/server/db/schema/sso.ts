import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const ssoAuth = sqliteTable("sso_auth", {
  state: text("state").primaryKey(),
  clientChallenge: text("client_challenge").notNull(),
  nonce: text("nonce").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  codeResponse: text("code_response"),
  authResponse: text("auth_response"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const ssoUsers = sqliteTable("sso_users", {
  userUuid: text("user_uuid").primaryKey().references(() => users.uuid),
  identifier: text("identifier").notNull(),
});
