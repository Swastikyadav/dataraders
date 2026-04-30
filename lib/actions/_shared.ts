export type DateRange = "7d" | "28d" | "90d" | "all";

const DAY_MS = 86_400_000;

export function rangeStart(range: DateRange): Date | undefined {
  const now = Date.now();
  switch (range) {
    case "7d":
      return new Date(now - 7 * DAY_MS);
    case "28d":
      return new Date(now - 28 * DAY_MS);
    case "90d":
      return new Date(now - 90 * DAY_MS);
    case "all":
      return undefined;
  }
}
