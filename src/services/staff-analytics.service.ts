import {
  findAttractionViewRanking,
  findDailyVisitorEvents,
  findTtsLanguages,
} from "../repositories/staff-analytics.repository";

const LANGUAGES = ["vi", "en", "zh", "ja", "ko", "fr", "de"] as const;
type Language = (typeof LANGUAGES)[number];

export async function getStaffAnalytics(days: 7 | 30) {
  const [daily, languageRows, rankRows] = await Promise.all([
    findDailyVisitorEvents(days), findTtsLanguages(days), findAttractionViewRanking(days),
  ]);
  const languages = Object.fromEntries(LANGUAGES.map(l => [l, 0])) as Record<Language, number>;
  for (const row of languageRows) {
    if (LANGUAGES.includes(row.language_code as Language)) {
      languages[row.language_code as Language] = Number(row.total);
    }
  }
  const series = daily.map(row => Number(row.attraction_views));
  const views = series.reduce((sum, value) => sum + value, 0);
  const listens = daily.reduce((sum, row) => sum + Number(row.tts_starts), 0);
  const starts = daily.reduce((sum, row) => sum + Number(row.route_starts), 0);
  return {
    days,
    dates: daily.map(row => row.day),
    series,
    views,
    listens,
    starts,
    vi: languages.vi,
    en: languages.en,
    languages,
    rankings: rankRows.map(row => ({
      id: Number(row.attraction_id),
      name: row.name,
      value: Number(row.total),
    })),
    scope: "visitor_events",
    timezone: "Asia/Ho_Chi_Minh",
  };
}
