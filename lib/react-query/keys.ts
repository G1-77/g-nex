

export const feedKeys = {
  all: ["feed"] as const,
  lists: () => [...feedKeys.all, "list"] as const,
  list: (filters: string) => [...feedKeys.lists(), filters] as const,
}