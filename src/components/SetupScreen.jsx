import { useState, useEffect } from 'react';
import { STOCKS, REPLAY_RANGES } from '../config/stocks';
import { loadStockData, getAvailableDates } from '../utils/dataLoader';
import { isValidStartDate, hasEnoughData } from '../utils/replayUtils';

/**
 * Setup screen for configuring replay session.
 */
export default function SetupScreen({ onStartReplay }) {
  const [selectedTicker, setSelectedTicker] = useState(STOCKS[0].ticker);
  const [selectedRange, setSelectedRange] = useState(REPLAY_RANGES[1]); // Default: Week
  const [startDate, setStartDate] = useState('');
  const [stockData, setStockData] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load stock data when ticker changes
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError('');
      setStockData(null);
      setStartDate('');

      try {
        const data = await loadStockData(selectedTicker);
        if (!cancelled) {
          setStockData(data);
          setAvailableDates(getAvailableDates(data));
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Gagal memuat data ${selectedTicker}: ${err.message}`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [selectedTicker]);

  const handleStartReplay = () => {
    setError('');

    if (!startDate) {
      setError('Pilih tanggal mulai replay.');
      return;
    }

    if (!stockData) {
      setError('Data saham belum dimuat.');
      return;
    }

    if (!isValidStartDate(stockData, startDate)) {
      setError('Tanggal yang dipilih tidak tersedia dalam dataset.');
      return;
    }

    if (!hasEnoughData(stockData, startDate, selectedRange.days)) {
      setError(`Data tidak cukup untuk ${selectedRange.label} replay dari tanggal tersebut.`);
      return;
    }

    onStartReplay({
      ticker: selectedTicker,
      range: selectedRange,
      startDate,
      stockData,
    });
  };

  const selectedStock = STOCKS.find(s => s.ticker === selectedTicker);

  return (
    <div className="setup-screen">
      <div className="setup-card">
        {/* Logo */}
        <div className="setup-logo">
          <div className="logo-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="12" width="4" height="12" rx="1" fill="#10b981" />
              <rect x="10" y="6" width="4" height="20" rx="1" fill="#f43f5e" />
              <rect x="16" y="10" width="4" height="14" rx="1" fill="#10b981" />
              <rect x="22" y="4" width="4" height="24" rx="1" fill="#10b981" />
              <line x1="4" y1="8" x2="8" y2="8" stroke="#10b981" strokeWidth="1.5" />
              <line x1="10" y1="4" x2="14" y2="4" stroke="#f43f5e" strokeWidth="1.5" />
              <line x1="16" y1="7" x2="20" y2="7" stroke="#10b981" strokeWidth="1.5" />
              <line x1="22" y1="2" x2="26" y2="2" stroke="#10b981" strokeWidth="1.5" />
            </svg>
          </div>
          <h1 className="logo-text">IDX Bar Replay</h1>
          <p className="logo-subtitle">Latihan membaca candlestick saham Indonesia</p>
        </div>

        {/* Stock selector */}
        <div className="form-group">
          <label className="form-label">Saham</label>
          <div className="select-wrapper">
            <select
              id="stock-select"
              className="form-select"
              value={selectedTicker}
              onChange={(e) => setSelectedTicker(e.target.value)}
            >
              {STOCKS.map((stock) => (
                <option key={stock.ticker} value={stock.ticker}>
                  {stock.ticker} — {stock.name}
                </option>
              ))}
            </select>
            <div className="select-arrow">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Replay Range */}
        <div className="form-group">
          <label className="form-label">Replay Range</label>
          <div className="range-buttons">
            {REPLAY_RANGES.map((range) => (
              <button
                key={range.label}
                className={`range-btn ${selectedRange.label === range.label ? 'active' : ''}`}
                onClick={() => setSelectedRange(range)}
              >
                {range.label}
                <span className="range-days">{range.days}d</span>
              </button>
            ))}
          </div>
        </div>

        {/* Start Date */}
        <div className="form-group">
          <label className="form-label">Tanggal Mulai</label>
          {loading ? (
            <div className="loading-indicator">
              <div className="spinner" />
              <span>Memuat data {selectedTicker}...</span>
            </div>
          ) : (
            <div className="select-wrapper">
              <select
                id="date-select"
                className="form-select"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!stockData}
              >
                <option value="">— Pilih tanggal —</option>
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
              <div className="select-arrow">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="error-message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        {/* Info */}
        {selectedStock && stockData && (
          <div className="setup-info">
            <span>{selectedStock.ticker}</span>
            <span>·</span>
            <span>{stockData.length} candles tersedia</span>
            <span>·</span>
            <span>1D</span>
          </div>
        )}

        {/* Start button */}
        <button
          className="btn btn-start"
          onClick={handleStartReplay}
          disabled={loading || !stockData}
        >
          Mulai Replay
        </button>
      </div>
    </div>
  );
}
