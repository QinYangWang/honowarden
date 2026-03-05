import { describe, it, expect } from "vitest";
import { generateUuid } from "../src/server/utils/id";
import { validateEmail, validateUuid, validateDomain } from "../src/server/utils/validation";
import { addDays, addMinutes, addHours } from "../src/server/utils/date";
import { isBlockedDomain } from "../src/server/utils/domain";

describe("UUID Generation", () => {
  it("generates valid UUIDs", () => {
    const uuid = generateUuid();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("generates unique UUIDs", () => {
    const uuids = new Set(Array.from({ length: 100 }, () => generateUuid()));
    expect(uuids.size).toBe(100);
  });
});

describe("Validation", () => {
  it("validates emails", () => {
    expect(validateEmail("test@example.com")).toBe(true);
    expect(validateEmail("user@domain.co.uk")).toBe(true);
    expect(validateEmail("invalid")).toBe(false);
    expect(validateEmail("@domain.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
  });

  it("validates UUIDs", () => {
    expect(validateUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(validateUuid("not-a-uuid")).toBe(false);
    expect(validateUuid("")).toBe(false);
  });

  it("validates domains", () => {
    expect(validateDomain("example.com")).toBe(true);
    expect(validateDomain("sub.example.com")).toBe(true);
    expect(validateDomain(".invalid")).toBe(false);
    expect(validateDomain("-invalid.com")).toBe(false);
    expect(validateDomain("")).toBe(false);
  });
});

describe("Date Utils", () => {
  it("adds days", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    const result = addDays(now, 7);
    expect(result.toISOString()).toBe("2025-01-08T00:00:00.000Z");
  });

  it("adds minutes", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    const result = addMinutes(now, 30);
    expect(result.toISOString()).toBe("2025-01-01T00:30:00.000Z");
  });

  it("adds hours", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    const result = addHours(now, 2);
    expect(result.toISOString()).toBe("2025-01-01T02:00:00.000Z");
  });
});

describe("Domain Blocking", () => {
  it("blocks localhost", () => {
    expect(isBlockedDomain("localhost")).toBe(true);
  });

  it("blocks private IPs", () => {
    expect(isBlockedDomain("10.0.0.1")).toBe(true);
    expect(isBlockedDomain("192.168.1.1")).toBe(true);
    expect(isBlockedDomain("127.0.0.1")).toBe(true);
  });

  it("allows public domains", () => {
    expect(isBlockedDomain("example.com")).toBe(false);
    expect(isBlockedDomain("google.com")).toBe(false);
  });
});
