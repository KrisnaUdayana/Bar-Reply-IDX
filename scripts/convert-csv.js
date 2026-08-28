import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_DIR = join(__dirname, '..', 'data', 'csv');
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

// Get all CSV files
const csvFiles = readdirSync(CSV_DIR).filter(f => extname(f).toLowerCase() === '.csv');

if (csvFiles.length === 0) {
  console.error('No CSV files found in', CSV_DIR);
  process.exit(1);
}

console.log(`Found ${csvFiles.length} CSV file(s):\n`);

for (const file of csvFiles) {
  const ticker = basename(file, '.csv');
  const csvPath = join(CSV_DIR, file);
  const jsonPath = join(OUTPUT_DIR, `${ticker}.json`);

  try {
    const raw = readFileSync(csvPath, 'utf-8');
    const lines = raw.trim().split(/\r?\n/);

    // Parse header
    const header = lines[0].split(',').map(h => h.trim());
    const dateIdx = header.findIndex(h => h.toLowerCase() === 'date');
    const openIdx = header.findIndex(h => h.toLowerCase() === 'open');
    const highIdx = header.findIndex(h => h.toLowerCase() === 'high');
    const lowIdx = header.findIndex(h => h.toLowerCase() === 'low');
    const closeIdx = header.findIndex(h => h.toLowerCase() === 'close');

    // Validate required columns
    if ([dateIdx, openIdx, highIdx, lowIdx, closeIdx].includes(-1)) {
      console.error(`  ✗ ${ticker}: Missing required columns. Found: [${header.join(', ')}]`);
      console.error(`    Required: Date, Open, High, Low, Close`);
      continue;
    }

    // Parse data rows
    const candles = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < 5) continue;

      const date = cols[dateIdx];
      const open = parseFloat(cols[openIdx]);
      const high = parseFloat(cols[highIdx]);
      const low = parseFloat(cols[lowIdx]);
      const close = parseFloat(cols[closeIdx]);

      // Validate
      if (!date || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
        console.warn(`  ⚠ ${ticker} line ${i + 1}: Skipping invalid row`);
        continue;
      }

      candles.push({ time: date, open, high, low, close });
    }

    // Sort by date ascending
    candles.sort((a, b) => a.time.localeCompare(b.time));

    // Write JSON
    writeFileSync(jsonPath, JSON.stringify(candles, null, 2), 'utf-8');
    console.log(`  ✓ ${ticker}: ${candles.length} candles → ${jsonPath}`);

  } catch (err) {
    console.error(`  ✗ ${ticker}: ${err.message}`);
  }
}

console.log('\nDone!');
