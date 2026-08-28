/**
 * Load stock data from local JSON or fallback directly to Yahoo Finance API.
 * @param {string} ticker - Stock ticker (e.g., 'BBCA')
 * @returns {Promise<Array<{time: string, open: number, high: number, low: number, close: number}>>}
 */
export async function loadStockData(ticker) {
  try {
    // 1. Try local JSON first
    const response = await fetch(`/data/${ticker}.json`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        data.sort((a, b) => a.time.localeCompare(b.time));
        return data;
      }
    }
  } catch (err) {
    console.warn(`Local JSON not found for ${ticker}, attempting live fetch...`);
  }

  // 2. Fallback to Yahoo Finance API directly in browser
  const yahooSymbol = ticker.endsWith('.JK') ? ticker : `${ticker}.JK`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=2y`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gagal mengunduh data ${ticker} dari server (${response.status})`);
  }

  const resultData = await response.json();
  const result = resultData?.chart?.result?.[0];

  if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
    throw new Error(`Data saham ${ticker} tidak ditemukan`);
  }

  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];
  const candles = [];

  for (let i = 0; i < timestamps.length; i++) {
    const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
    const open = quote.open[i];
    const high = quote.high[i];
    const low = quote.low[i];
    const close = quote.close[i];

    if (open == null || high == null || low == null || close == null || isNaN(open)) {
      continue;
    }

    candles.push({
      time: dateStr,
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
    });
  }

  candles.sort((a, b) => a.time.localeCompare(b.time));

  if (candles.length === 0) {
    throw new Error(`Data candle untuk ${ticker} kosong`);
  }

  return candles;
}

/**
 * Get available dates from stock data.
 * @param {Array} data - Array of candle objects
 * @returns {string[]} - Array of date strings
 */
export function getAvailableDates(data) {
  return data.map(candle => candle.time);
}
