/**
 * Load stock data from local JSON or fallback directly to Yahoo Finance API.
 * @param {string} ticker - Stock ticker (e.g., 'BBCA')
 * @param {'1d'|'1h'} interval - Candle interval ('1d' or '1h')
 * @returns {Promise<Array<{time: string|number, open: number, high: number, low: number, close: number}>>}
 */
export async function loadStockData(ticker, interval = '1d') {
  if (interval === '1h') {
    return loadHourlyStockData(ticker);
  }

  // 1. Try local JSON first (daily)
  try {
    const response = await fetch(`/data/${ticker}.json`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        data.sort((a, b) => (typeof a.time === 'string' ? a.time.localeCompare(b.time) : a.time - b.time));
        return data;
      }
    }
  } catch (err) {
    console.warn(`Local JSON not found for ${ticker}, attempting live fetch...`);
  }

  // 2. Fallback to Yahoo Finance API (daily)
  const yahooSymbol = ticker.endsWith('.JK') ? ticker : `${ticker}.JK`;
  const startTimestamp = Math.floor(new Date('2020-01-01T00:00:00Z').getTime() / 1000);
  const endTimestamp = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`;

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
 * Load 1-hour stock data from local JSON or Yahoo Finance API.
 */
async function loadHourlyStockData(ticker) {
  // 1. Try local 1h JSON
  try {
    const response = await fetch(`/data/${ticker}_1h.json`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        data.sort((a, b) => (typeof a.time === 'string' ? a.time.localeCompare(b.time) : a.time - b.time));
        return data;
      }
    }
  } catch (err) {
    console.warn(`Local 1h JSON not found for ${ticker}`);
  }

  // 2. Fetch from Yahoo Finance (interval=1h, last 700 days max)
  const yahooSymbol = ticker.endsWith('.JK') ? ticker : `${ticker}.JK`;
  const startTimestamp = Math.floor((Date.now() - 700 * 86400 * 1000) / 1000);
  const endTimestamp = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1h`;

  try {
    const response = await fetch(url);
    if (response.ok) {
      const resultData = await response.json();
      const result = resultData?.chart?.result?.[0];

      if (result && result.timestamp && result.indicators?.quote?.[0]) {
        const timestamps = result.timestamp;
        const quote = result.indicators.quote[0];
        const candles = [];

        for (let i = 0; i < timestamps.length; i++) {
          const open = quote.open[i];
          const high = quote.high[i];
          const low = quote.low[i];
          const close = quote.close[i];

          if (open == null || high == null || low == null || close == null || isNaN(open)) {
            continue;
          }

          candles.push({
            time: timestamps[i], // Unix timestamp in seconds
            open: Math.round(open),
            high: Math.round(high),
            low: Math.round(low),
            close: Math.round(close),
          });
        }

        candles.sort((a, b) => a.time - b.time);
        if (candles.length > 0) {
          return candles;
        }
      }
    }
  } catch (err) {
    console.warn(`Gagal fetch 1h data dari Yahoo Finance untuk ${ticker}: ${err.message}`);
  }

  // 3. Fallback: generate simulated 1h candles from daily data if 1h fetch fails
  const dailyData = await loadStockData(ticker, '1d');
  return generateHourlyFromDaily(dailyData);
}

/**
 * Fallback helper to convert daily candles to 4 hourly candles per day.
 */
function generateHourlyFromDaily(dailyCandles) {
  const hourlyCandles = [];

  for (const daily of dailyCandles) {
    const dateObj = new Date(`${daily.time}T00:00:00+07:00`);
    const dayOfWeek = dateObj.getUTCDay(); // 5 = Friday
    const baseTimeMs = dateObj.getTime();
    const { open, high, low, close } = daily;
    const isUp = close >= open;

    // Mon-Thu: Sesi I (09:00, 10:00, 11:00), Sesi II (13:30, 14:30, 15:00 -> tutup 16:00)
    // Fri: Sesi I (09:00, 10:00), Sesi II (14:00, 15:00 -> tutup 16:00)
    const sessionOffsets = dayOfWeek === 5
      ? [9 * 3600, 10 * 3600, 14 * 3600, 15 * 3600]
      : [9 * 3600, 10 * 3600, 11 * 3600, 13.5 * 3600, 14.5 * 3600, 15 * 3600];

    let prevClose = open;

    for (let i = 0; i < sessionOffsets.length; i++) {
      const hourUnix = Math.floor((baseTimeMs + sessionOffsets[i] * 1000) / 1000);
      const isLast = i === sessionOffsets.length - 1;

      const candleOpen = prevClose;
      const progress = (i + 1) / sessionOffsets.length;
      const targetClose = isLast ? close : Math.round(open + (close - open) * progress);

      const candleHigh = Math.max(candleOpen, targetClose, isUp ? Math.round(high - (high - Math.max(open, close)) * (1 - progress)) : Math.round(high - (high - open) * 0.1));
      const candleLow = Math.min(candleOpen, targetClose, !isUp ? Math.round(low + (Math.min(open, close) - low) * (1 - progress)) : Math.round(low + (open - low) * 0.1));

      hourlyCandles.push({
        time: hourUnix,
        open: candleOpen,
        high: candleHigh,
        low: candleLow,
        close: targetClose,
      });

      prevClose = targetClose;
    }
  }

  return hourlyCandles;
}

/**
 * Get available dates from stock data.
 * @param {Array} data - Array of candle objects
 * @returns {string[]} - Array of date strings
 */
export function getAvailableDates(data) {
  return data.map(candle => candle.time);
}
