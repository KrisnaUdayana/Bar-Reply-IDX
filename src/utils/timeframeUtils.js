/**
 * Helper utility functions for stock timeframe conversions.
 */

/**
 * Get Monday date string (YYYY-MM-DD) for any given ISO date string.
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} - Monday date string in YYYY-MM-DD format
 */
function getMonday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Aggregate daily candles array into weekly OHLC candles.
 * Each weekly candle takes:
 * - time: date of the first trading day of the week
 * - open: open price of the first day of the week
 * - high: highest price during the week
 * - low: lowest price during the week
 * - close: close price of the last trading day of the week
 *
 * @param {Array<{time: string, open: number, high: number, low: number, close: number}>} dailyCandles
 * @returns {Array<{time: string, open: number, high: number, low: number, close: number}>}
 */
export function aggregateToWeekly(dailyCandles) {
  if (!Array.isArray(dailyCandles) || dailyCandles.length === 0) {
    return [];
  }

  const weeklyMap = new Map();

  for (const candle of dailyCandles) {
    if (!candle || !candle.time) continue;
    const mondayKey = getMonday(candle.time);

    if (!weeklyMap.has(mondayKey)) {
      weeklyMap.set(mondayKey, {
        time: candle.time, // First trading day date of the week
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });
    } else {
      const existing = weeklyMap.get(mondayKey);
      existing.high = Math.max(existing.high, candle.high);
      existing.low = Math.min(existing.low, candle.low);
      existing.close = candle.close;
    }
  }

  return Array.from(weeklyMap.values());
}
