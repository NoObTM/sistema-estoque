// Datas operacionais da construtora em São Paulo; instantes são gravados em UTC.
export function dateRange(from?: string, to?: string) {
  return {
    gte: from ? new Date(`${from}T00:00:00-03:00`) : undefined,
    lt: to
      ? new Date(new Date(`${to}T00:00:00-03:00`).getTime() + 86400000)
      : undefined,
  };
}
