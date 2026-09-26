/** Builds an ISO timestamp relative to now so mock data always looks fresh. */
export function ago({ days = 0, hours = 0, minutes = 0 }: { days?: number; hours?: number; minutes?: number }): string {
  const ms = ((days * 24 + hours) * 60 + minutes) * 60_000;
  return new Date(Date.now() - ms).toISOString();
}
