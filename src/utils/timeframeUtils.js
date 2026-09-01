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

/**
 * Aggregate daily candles array into monthly OHLC candles.
 * Each monthly candle takes:
 * - time: date of the first trading day of the month
 * - open: open price of the first day of the month
 * - high: highest price during the month
 * - low: lowest price during the month
 * - close: close price of the last trading day of the month
 *
 * @param {Array<{time: string, open: number, high: number, low: number, close: number}>} dailyCandles
 * @returns {Array<{time: string, open: number, high: number, low: number, close: number}>}
 */
export function aggregateToMonthly(dailyCandles) {
  if (!Array.isArray(dailyCandles) || dailyCandles.length === 0) {
    return [];
  }

  const monthlyMap = new Map();

  for (const candle of dailyCandles) {
    if (!candle || !candle.time) continue;
    const monthKey = candle.time.substring(0, 7); // "YYYY-MM"

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        time: candle.time, // First trading day date of the month
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });
    } else {
      const existing = monthlyMap.get(monthKey);
      existing.high = Math.max(existing.high, candle.high);
      existing.low = Math.min(existing.low, candle.low);
      existing.close = candle.close;
    }
  }

  return Array.from(monthlyMap.values());
}

/**
 * Helper to get date string YYYY-MM-DD from candle time (number or string).
 */
function getDateString(time) {
  if (typeof time === 'number') {
    return new Date(time * 1000).toISOString().split('T')[0];
  }
  if (typeof time === 'string') {
    return time.split('T')[0].split(' ')[0];
  }
  return '';
}

/**
 * Aggregate 1-hour candles array into N-hour OHLC candles (e.g. 2H, 3H, 4H).
 * Groups candles by trading day and steps every N candles.
 *
 * @param {Array<{time: number|string, open: number, high: number, low: number, close: number}>} hourlyCandles
 * @param {number} stepHours - 2, 3, or 4
 * @returns {Array<{time: number|string, open: number, high: number, low: number, close: number}>}
 */
export function aggregateToNHours(hourlyCandles, stepHours = 1) {
  if (!Array.isArray(hourlyCandles) || hourlyCandles.length === 0 || stepHours <= 1) {
    return hourlyCandles || [];
  }

  // 1. Group 1h candles by date string
  const daysMap = new Map();
  for (const candle of hourlyCandles) {
    if (!candle || candle.time == null) continue;
    const dateKey = getDateString(candle.time);
    if (!daysMap.has(dateKey)) {
      daysMap.set(dateKey, []);
    }
    daysMap.get(dateKey).push(candle);
  }

  const result = [];

  // 2. For each day, group every N candles
  for (const [, dayCandles] of daysMap) {
    for (let i = 0; i < dayCandles.length; i += stepHours) {
      const chunk = dayCandles.slice(i, i + stepHours);
      if (chunk.length === 0) continue;

      let high = chunk[0].high;
      let low = chunk[0].low;
      for (let j = 1; j < chunk.length; j++) {
        high = Math.max(high, chunk[j].high);
        low = Math.min(low, chunk[j].low);
      }

      result.push({
        time: chunk[0].time,
        open: chunk[0].open,
        high,
        low,
        close: chunk[chunk.length - 1].close,
      });
    }
  }

  return result;
}
