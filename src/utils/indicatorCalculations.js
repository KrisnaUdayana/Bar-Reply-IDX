// MACD (Moving Average Convergence Divergence) Calculation
// MACD = 12-period EMA - 26-period EMA
// Signal Line = 9-period EMA of MACD
// Histogram = MACD - Signal Line

function calculateEMA(data, period) {
  // Filter out undefined values
  const validData = data.map((v, i) => ({ value: v, index: i }))
    .filter(item => item.value !== undefined && !isNaN(item.value));

  if (validData.length < period) {
    return new Array(data.length).fill(undefined);
  }

  const ema = new Array(data.length).fill(undefined);
  let sum = 0;

  // Calculate SMA for first EMA value using valid data
  for (let i = 0; i < period; i++) {
    sum += validData[i].value;
  }
  let emaValue = sum / period;
  ema[validData[period - 1].index] = emaValue;

  // Calculate EMA for remaining values
  const multiplier = 2 / (period + 1);
  for (let i = period; i < validData.length; i++) {
    emaValue = (validData[i].value - emaValue) * multiplier + emaValue;
    ema[validData[i].index] = emaValue;
  }

  return ema;
}

export function calculateMACD(candleData, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!candleData || candleData.length < slowPeriod) {
    return [];
  }

  // Extract closing prices
  const closePrices = candleData.map(candle => candle.close);

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(closePrices, fastPeriod);
  const slowEMA = calculateEMA(closePrices, slowPeriod);

  // Calculate MACD line (difference between fast and slow EMA)
  const macdLine = [];
  for (let i = 0; i < closePrices.length; i++) {
    if (fastEMA[i] !== undefined && slowEMA[i] !== undefined) {
      macdLine[i] = fastEMA[i] - slowEMA[i];
    }
  }

  // Calculate signal line (9-period EMA of MACD)
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // Calculate histogram (MACD - Signal)
  const histogram = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== undefined && signalLine[i] !== undefined) {
      histogram[i] = macdLine[i] - signalLine[i];
    }
  }

  // Return MACD data with proper indexing
  return candleData.map((candle, index) => ({
    time: candle.time,
    macd: macdLine[index],
    signal: signalLine[index],
    histogram: histogram[index],
  }));
}
