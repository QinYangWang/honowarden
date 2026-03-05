import { relations } from "drizzle-orm";
import { users } from "./users";
import { ciphers, ciphersCollections } from "./ciphers";
import { folders, foldersCiphers } from "./folders";
import { organizations, usersOrganizations } from "./organizations";
import { collections, usersCollections } from "./collections";
import { groups, groupsUsers, collectionsGroups } from "./groups";
import { devices } from "./devices";
import { attachments } from "./attachments";
import { sends } from "./sends";
import { twofactor } from "./two-factor";
import { emergencyAccess } from "./emergency-access";
import { orgPolicies } from "./org-policies";
import { favorites } from "./favorites";
import { authRequests } from "./auth-requests";

export const usersRelations = relations(users, ({ many }) => ({
  ciphers: many(ciphers),
  devices: many(devices),
  folders: many(folders),
  sends: many(sends),
  memberships: many(usersOrganizations),
  collections: many(usersCollections),
  favorites: many(favorites),
  twofactors: many(twofactor),
  emergencyAccessGranted: many(emergencyAccess, { relationName: "grantor" }),
  authRequests: many(authRequests),
}));

export const ciphersRelations = relations(ciphers, ({ one, many }) => ({
  user: one(users, { fields: [ciphers.userUuid], references: [users.uuid] }),
  organization: one(organizations, { fields: [ciphers.organizationUuid], references: [organizations.uuid] }),
  attachments: many(attachments),
  collections: many(ciphersCollections),
  folders: many(foldersCiphers),
  favorites: many(favorites),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(usersOrganizations),
  collections: many(collections),
  ciphers: many(ciphers),
  groups: many(groups),
  policies: many(orgPolicies),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  organization: one(organizations, { fields: [collections.orgUuid], references: [organizations.uuid] }),
  users: many(usersCollections),
  ciphers: many(ciphersCollections),
  groups: many(collectionsGroups),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  organization: one(organizations, { fields: [groups.organizationsUuid], references: [organizations.uuid] }),
  users: many(groupsUsers),
  collections: many(collectionsGroups),
}));

export const devicesRelations = relations(devices, ({ one }) => ({
  user: one(users, { fields: [devices.userUuid], references: [users.uuid] }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  cipher: one(ciphers, { fields: [attachments.cipherUuid], references: [ciphers.uuid] }),
}));

export const sendsRelations = relations(sends, ({ one }) => ({
  user: one(users, { fields: [sends.userUuid], references: [users.uuid] }),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  user: one(users, { fields: [folders.userUuid], references: [users.uuid] }),
  ciphers: many(foldersCiphers),
}));

export const usersOrganizationsRelations = relations(usersOrganizations, ({ one }) => ({
  user: one(users, { fields: [usersOrganizations.userUuid], references: [users.uuid] }),
  organization: one(organizations, { fields: [usersOrganizations.orgUuid], references: [organizations.uuid] }),
}));

export const emergencyAccessRelations = relations(emergencyAccess, ({ one }) => ({
  grantor: one(users, { fields: [emergencyAccess.grantorUuid], references: [users.uuid], relationName: "grantor" }),
  grantee: one(users, { fields: [emergencyAccess.granteeUuid], references: [users.uuid] }),
}));

export const twofactorRelations = relations(twofactor, ({ one }) => ({
  user: one(users, { fields: [twofactor.userUuid], references: [users.uuid] }),
}));

export const orgPoliciesRelations = relations(orgPolicies, ({ one }) => ({
  organization: one(organizations, { fields: [orgPolicies.orgUuid], references: [organizations.uuid] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userUuid], references: [users.uuid] }),
  cipher: one(ciphers, { fields: [favorites.cipherUuid], references: [ciphers.uuid] }),
}));

export const authRequestsRelations = relations(authRequests, ({ one }) => ({
  user: one(users, { fields: [authRequests.userUuid], references: [users.uuid] }),
}));

export const ciphersCollectionsRelations = relations(ciphersCollections, ({ one }) => ({
  cipher: one(ciphers, { fields: [ciphersCollections.cipherUuid], references: [ciphers.uuid] }),
  collection: one(collections, { fields: [ciphersCollections.collectionUuid], references: [collections.uuid] }),
}));

export const foldersCiphersRelations = relations(foldersCiphers, ({ one }) => ({
  cipher: one(ciphers, { fields: [foldersCiphers.cipherUuid], references: [ciphers.uuid] }),
  folder: one(folders, { fields: [foldersCiphers.folderUuid], references: [folders.uuid] }),
}));

export const usersCollectionsRelations = relations(usersCollections, ({ one }) => ({
  user: one(users, { fields: [usersCollections.userUuid], references: [users.uuid] }),
  collection: one(collections, { fields: [usersCollections.collectionUuid], references: [collections.uuid] }),
}));

export const groupsUsersRelations = relations(groupsUsers, ({ one }) => ({
  group: one(groups, { fields: [groupsUsers.groupsUuid], references: [groups.uuid] }),
  membership: one(usersOrganizations, { fields: [groupsUsers.usersOrganizationsUuid], references: [usersOrganizations.uuid] }),
}));

export const collectionsGroupsRelations = relations(collectionsGroups, ({ one }) => ({
  collection: one(collections, { fields: [collectionsGroups.collectionsUuid], references: [collections.uuid] }),
  group: one(groups, { fields: [collectionsGroups.groupsUuid], references: [groups.uuid] }),
}));
