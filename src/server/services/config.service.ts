import type { Env } from "../env";

const DEFAULTS: Record<string, unknown> = {
  signups_allowed: true,
  signups_verify: false,
  signups_domains_whitelist: "",
  invitations_allowed: true,
  show_password_hint: true,
  password_hints_allowed: true,
  mail_enabled: true,
  smtp_from: "",
  smtp_from_name: "HonoWarden",
  authenticator_enabled: true,
  email_2fa_enabled: true,
  duo_enabled: false,
  yubikey_enabled: false,
  webauthn_enabled: true,
  org_creation_users: "",
  org_groups_enabled: false,
  org_events_enabled: false,
  trash_auto_delete_days: 30,
  events_days_retain: 365,
  emergency_access_allowed: true,
  sends_allowed: true,
  icon_service: "internal",
  icon_download_enabled: true,
  icon_cache_ttl: 2592000,
  icon_cache_negttl: 259200,
  push_enabled: false,
  push_relay_uri: "https://push.bitwarden.com",
  sso_enabled: false,
};

const CONFIG_VALIDATORS: Record<string, (v: unknown) => boolean> = {
  trash_auto_delete_days: (v) => typeof v === "number" && v >= 0 && v <= 365,
  events_days_retain: (v) => typeof v === "number" && v >= 0,
  icon_cache_ttl: (v) => typeof v === "number" && v >= 0,
  icon_cache_negttl: (v) => typeof v === "number" && v >= 0,
  signups_allowed: (v) => typeof v === "boolean",
  signups_verify: (v) => typeof v === "boolean",
  mail_enabled: (v) => typeof v === "boolean",
  push_enabled: (v) => typeof v === "boolean",
  sso_enabled: (v) => typeof v === "boolean",
};

export async function getConfig<T = string>(
  env: Env,
  key: string,
  fallback?: T,
): Promise<T> {
  const kvValue = await env.CONFIG.get(`config:${key}`);
  if (kvValue !== null) {
    try {
      return JSON.parse(kvValue) as T;
    } catch {
      return kvValue as unknown as T;
    }
  }

  const envKey = key.toUpperCase();
  const envValue = (env as Record<string, unknown>)[envKey];
  if (envValue !== undefined) {
    return envValue as T;
  }

  if (fallback !== undefined) return fallback;
  return DEFAULTS[key] as T;
}

export async function setConfig(
  env: Env,
  key: string,
  value: unknown,
): Promise<void> {
  await env.CONFIG.put(`config:${key}`, JSON.stringify(value));
}

export async function deleteConfig(env: Env, key: string): Promise<void> {
  await env.CONFIG.delete(`config:${key}`);
}

export async function getAllConfig(env: Env): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(DEFAULTS)) {
    result[key] = value;
  }

  const list = await env.CONFIG.list({ prefix: "config:" });
  for (const key of list.keys) {
    const name = key.name.replace("config:", "");
    const value = await env.CONFIG.get(key.name);
    if (value !== null) {
      try {
        result[name] = JSON.parse(value);
      } catch {
        result[name] = value;
      }
    }
  }

  return result;
}

export async function resetAllConfig(env: Env): Promise<void> {
  const list = await env.CONFIG.list({ prefix: "config:" });
  for (const key of list.keys) {
    await env.CONFIG.delete(key.name);
  }
}

export function validateConfig(key: string, value: unknown): boolean {
  const validator = CONFIG_VALIDATORS[key];
  if (!validator) return true;
  return validator(value);
}
