import { getCollection, type CollectionEntry } from 'astro:content';

export type Week = CollectionEntry<'weeks'>;

export function artistsOf(week: Week): string[] {
  const a = week.data.artist;
  return Array.isArray(a) ? a : [a];
}

export function artistLabel(week: Week): string {
  return artistsOf(week).join(', ');
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}

/** "2:14" -> 134, "1:02:03" -> 3723 */
export function timestampToSeconds(ts: string): number {
  return ts.split(':').map(Number).reduce((acc, n) => acc * 60 + n, 0);
}

/** Published weeks, newest first. Validates that week numbers are unique. */
export async function getWeeks(): Promise<Week[]> {
  const all = await getCollection('weeks', ({ data }) => !data.draft);
  const seen = new Map<number, string>();
  for (const w of all) {
    const prev = seen.get(w.data.week);
    if (prev) throw new Error(`Week ${w.data.week} is defined twice: ${prev} and ${w.id}`);
    seen.set(w.data.week, w.id);
  }
  return all.sort((a, b) => b.data.week - a.data.week);
}

export async function getLatestWeek(): Promise<Week> {
  const [latest] = await getWeeks();
  if (!latest) throw new Error('No published weeks found in src/content/weeks');
  return latest;
}

export interface Stats {
  count: number;
  average: number;
  highest: Week[];
  lowest: Week[];
  topArtists: { name: string; count: number }[];
}

export function computeStats(weeks: Week[]): Stats {
  const scores = weeks.map((w) => w.data.score);
  const max = Math.max(...scores);
  const min = Math.min(...scores);

  const counts = new Map<string, number>();
  for (const w of weeks) {
    for (const name of artistsOf(w)) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const topArtists = [...counts]
    .map(([name, count]) => ({ name, count }))
    .filter((a) => a.count > 1)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    count: weeks.length,
    average: scores.reduce((s, n) => s + n, 0) / scores.length,
    highest: weeks.filter((w) => w.data.score === max),
    lowest: weeks.filter((w) => w.data.score === min),
    topArtists,
  };
}

export function weekHref(week: number): string {
  return `/week/${week}`;
}
