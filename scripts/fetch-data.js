import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_DIR = join(__dirname, '..', 'data', 'csv');
const JSON_DIR = join(__dirname, '..', 'public', 'data');

// Default Indonesian stock tickers to fetch if none provided
const DEFAULT_TICKERS = ['BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII'];

// Custom tickers passed via command line args (e.g. node scripts/fetch-data.js GOTO UNVR)
const args = process.argv.slice(2);
const tickersToFetch = args.length > 0 ? args.map(t => t.toUpperCase()) : DEFAULT_TICKERS;

// Ensure output directories exist
mkdirSync(CSV_DIR, { recursive: true });
mkdirSync(JSON_DIR, { recursive: true });

/**
 * Fetch historical data for a stock from Yahoo Finance v8 chart API.
 * @param {string} ticker - Stock ticker symbol (e.g., 'BBCA')
 */
async function fetchStockData(ticker) {
  const yahooSymbol = ticker.endsWith('.JK') ? ticker : `${ticker}.JK`;
  const cleanTicker = ticker.replace('.JK', '');

  // 2 years of daily data
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=2y`;

  console.log(`📡 Fetching ${cleanTicker} (${yahooSymbol}) from Yahoo Finance...`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      throw new Error(`Invalid or empty response from Yahoo Finance for ${cleanTicker}`);
    }

    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    const candles = [];
    const csvRows = ['Date,Open,High,Low,Close'];

    for (let i = 0; i < timestamps.length; i++) {
      const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      const open = quote.open[i];
      const high = quote.high[i];
      const low = quote.low[i];
      const close = quote.close[i];

      // Skip invalid/null rows (trading holidays)
      if (open == null || high == null || low == null || close == null || isNaN(open)) {
        continue;
      }

      const o = Math.round(open);
      const h = Math.round(high);
      const l = Math.round(low);
      const c = Math.round(close);

      candles.push({ time: dateStr, open: o, high: h, low: l, close: c });
      csvRows.push(`${dateStr},${o},${h},${l},${c}`);
    }

    // Sort by date ascending
    candles.sort((a, b) => a.time.localeCompare(b.time));

    // Save CSV
    const csvPath = join(CSV_DIR, `${cleanTicker}.csv`);
    writeFileSync(csvPath, csvRows.join('\n'), 'utf-8');

    // Save JSON
    const jsonPath = join(JSON_DIR, `${cleanTicker}.json`);
    writeFileSync(jsonPath, JSON.stringify(candles, null, 2), 'utf-8');

    console.log(`  ✓ ${cleanTicker}: Downloaded ${candles.length} candles (${candles[0].time} → ${candles[candles.length - 1].time})`);
    console.log(`    CSV saved to: ${csvPath}`);
    console.log(`    JSON saved to: ${jsonPath}`);
    return true;
  } catch (err) {
    console.error(`  ✗ ${cleanTicker}: Failed — ${err.message}`);
    return false;
  }
}

async function main() {
  console.log(`====================================================`);
  console.log(`🚀 IDX Bar Replay — Auto Fetch Stock Data`);
  console.log(`====================================================\n`);

  let successCount = 0;
  for (const ticker of tickersToFetch) {
    const ok = await fetchStockData(ticker);
    if (ok) successCount++;
  }

  console.log(`\n====================================================`);
  console.log(`✨ Completed! Downloaded ${successCount}/${tickersToFetch.length} stocks.`);
  console.log(`====================================================\n`);
}

main();
