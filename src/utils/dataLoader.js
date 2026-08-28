/**
 * Load stock data from static JSON files.
 * @param {string} ticker - Stock ticker (e.g., 'BBCA')
 * @returns {Promise<Array<{time: string, open: number, high: number, low: number, close: number}>>}
 */
export async function loadStockData(ticker) {
  const response = await fetch(`/data/${ticker}.json`);

  if (!response.ok) {
    throw new Error(`Failed to load data for ${ticker}: ${response.status}`);
  }

  const data = await response.json();

  // Validate data structure
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No data found for ${ticker}`);
  }

  // Ensure data is sorted by time ascending
  data.sort((a, b) => a.time.localeCompare(b.time));

  return data;
}

/**
 * Get available dates from stock data.
 * @param {Array} data - Array of candle objects
 * @returns {string[]} - Array of date strings
 */
export function getAvailableDates(data) {
  return data.map(candle => candle.time);
}
