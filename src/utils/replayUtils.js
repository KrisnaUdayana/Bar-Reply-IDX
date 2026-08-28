/**
 * Extract replay data with historical context (TradingView-style).
 *
 * The key difference from a naive approach:
 * - All candles BEFORE startDate are shown immediately as historical context
 * - Replay only reveals candles FROM startDate onward, one at a time
 * - Range determines how many NEW candles will be revealed
 *
 * @param {Array} allData - Full stock data array
 * @param {string} startDate - Date where replay begins (YYYY-MM-DD)
 * @param {number} rangeDays - Number of new candles to reveal
 * @returns {{ historyData: Array, replayCandles: Array, replayStartIndex: number } | null}
 */
export function getReplayData(allData, startDate, rangeDays) {
  const startIndex = allData.findIndex(candle => candle.time === startDate);

  if (startIndex === -1) {
    return null;
  }

  // Historical context: all candles BEFORE the start date
  const historyData = allData.slice(0, startIndex);

  // Replay candles: from start date, limited by range
  const endIndex = Math.min(startIndex + rangeDays, allData.length);
  const replayCandles = allData.slice(startIndex, endIndex);

  if (replayCandles.length === 0) {
    return null;
  }

  return {
    historyData,       // Shown immediately as context
    replayCandles,     // Revealed one by one
    replayStartIndex: startIndex,
  };
}

/**
 * Format a date string (YYYY-MM-DD) to localized display format.
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} - Formatted date (e.g., "15 Jan 2025")
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Validate that a date exists in the stock data.
 * @param {Array} data - Full stock data array
 * @param {string} dateStr - Date to validate
 * @returns {boolean}
 */
export function isValidStartDate(data, dateStr) {
  return data.some(candle => candle.time === dateStr);
}

/**
 * Check if there are enough candles from start date for the given range.
 * @param {Array} data - Full stock data array
 * @param {string} startDate - Start date string
 * @param {number} rangeDays - Required number of trading days
 * @returns {boolean}
 */
export function hasEnoughData(data, startDate, rangeDays) {
  const startIndex = data.findIndex(candle => candle.time === startDate);
  if (startIndex === -1) return false;
  return (startIndex + rangeDays) <= data.length;
}
