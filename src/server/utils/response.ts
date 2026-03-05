export function listResponse(data: unknown[]) {
  return {
    data,
    object: "list",
    continuationToken: null,
  };
}
