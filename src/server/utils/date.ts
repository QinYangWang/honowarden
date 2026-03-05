export function nowDate(): Date {
  return new Date();
}

export function nowTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function toISOString(date: Date): string {
  return date.toISOString();
}

export function fromUnixTimestamp(ts: number): Date {
  return new Date(ts * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400_000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600_000);
}
