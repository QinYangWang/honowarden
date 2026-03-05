export function createMockAuthHeader(userId: string): Record<string, string> {
  return {
    Authorization: `Bearer mock-token-for-${userId}`,
  };
}
