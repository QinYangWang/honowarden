const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /\.local$/i,
  /\.internal$/i,
];

export function isBlockedDomain(domain: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(domain));
}

export function isValidIconContentType(contentType: string): boolean {
  const valid = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/x-icon",
    "image/vnd.microsoft.icon",
    "image/bmp",
    "image/svg+xml",
  ];
  return valid.some((v) => contentType.startsWith(v));
}
