/**
 * Hebrew/Jewish holidays for calendar display.
 * Uses the Hebcal API to fetch holidays for a given year range.
 * Falls back to a static list if the API is unavailable.
 */

export interface HebrewHoliday {
  date: string; // YYYY-MM-DD
  name: string; // Hebrew name
  isYomTov: boolean; // Major holiday (no work)
}

const cache = new Map<string, HebrewHoliday[]>();

export async function getHolidays(year: number, month: number): Promise<HebrewHoliday[]> {
  const key = `${year}-${month}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&start=${startDate}&end=${endDate}&i=on&lg=he`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error("Hebcal API error");

    const data = await res.json();
    const holidays: HebrewHoliday[] = (data.items ?? []).map((item: { date: string; hebrew: string; yomtov?: boolean; subcat?: string }) => ({
      date: item.date,
      name: item.hebrew,
      isYomTov: item.yomtov === true || item.subcat === "major",
    }));

    cache.set(key, holidays);
    return holidays;
  } catch {
    return [];
  }
}

/** Synchronous lookup from cache only */
export function getHolidayForDate(dateStr: string, holidays: HebrewHoliday[]): HebrewHoliday | undefined {
  return holidays.find((h) => h.date === dateStr);
}
