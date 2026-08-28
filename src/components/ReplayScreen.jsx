import { useState, useEffect } from 'react';
import { STOCKS } from '../config/stocks';
import { loadStockData } from '../utils/dataLoader';
import { useReplayEngine } from '../hooks/useReplayEngine';
import CandlestickChart from './CandlestickChart';
import ReplayControls from './ReplayControls';
import ReplayFinished from './ReplayFinished';

/**
 * Main trading view workspace component.
 * Allows viewing full chart history first, then picking replay point on chart.
 */
export default function ReplayScreen() {
  const [selectedTicker, setSelectedTicker] = useState(STOCKS[0].ticker);
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch full stock data when ticker changes
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const data = await loadStockData(selectedTicker);
        if (!cancelled) {
          setStockData(data);
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

  const {
    mode,
    cutoffIndex,
    currentIndex,
    isPlaying,
    speed,
    showFinishedModal,
    visibleCandles,
    currentCandle,
    totalCandles,
    startPicking,
    exitReplay,
    selectCutoffByTime,
    next,
    previous,
    togglePlay,
    resetToCutoff,
    changeSpeed,
    dismissFinishedModal,
  } = useReplayEngine(stockData);

  return (
    <div className="replay-workspace">
      {/* Header Bar */}
      <header className="workspace-header">
        <div className="header-left">
          <div className="app-logo">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="12" width="4" height="12" rx="1" fill="#10b981" />
              <rect x="10" y="6" width="4" height="20" rx="1" fill="#f43f5e" />
              <rect x="16" y="10" width="4" height="14" rx="1" fill="#10b981" />
              <rect x="22" y="4" width="4" height="24" rx="1" fill="#10b981" />
            </svg>
            <span className="logo-title">IDX BAR REPLAY</span>
          </div>

          <div className="ticker-selector-wrapper">
            <select
              className="ticker-select"
              value={selectedTicker}
              onChange={(e) => setSelectedTicker(e.target.value)}
            >
              {STOCKS.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.ticker} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <span className="timeframe-badge">1D</span>
        </div>

        <div className="header-right">
          {mode === 'normal' && (
            <button
              className="btn-bar-replay"
              onClick={startPicking}
              title="Aktifkan Replay mode & pilih candle pada chart"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="12 8 8 12 12 16 12 8" />
              </svg>
              <span>Bar Replay</span>
            </button>
          )}

          {mode === 'picking' && (
            <span className="header-status-badge picking">
              ✂️ Klik candle pada chart...
            </span>
          )}

          {mode === 'replaying' && (
            <span className="header-status-badge active">
              🔴 Replay Mode
            </span>
          )}
        </div>
      </header>

      {/* Main Chart Area */}
      <main className="workspace-main">
        {loading ? (
          <div className="workspace-loading">
            <div className="spinner" />
            <span>Memuat chart {selectedTicker}...</span>
          </div>
        ) : error ? (
          <div className="workspace-error">{error}</div>
        ) : (
          <CandlestickChart
            data={visibleCandles}
            ticker={selectedTicker}
            isPicking={mode === 'picking'}
            onSelectCandleTime={selectCutoffByTime}
          />
        )}
      </main>

      {/* Controls Bar */}
      <ReplayControls
        mode={mode}
        currentIndex={currentIndex}
        cutoffIndex={cutoffIndex}
        totalCandles={totalCandles}
        currentCandle={currentCandle}
        isPlaying={isPlaying}
        speed={speed}
        onNext={next}
        onPrevious={previous}
        onTogglePlay={togglePlay}
        onReset={resetToCutoff}
        onStartPicking={startPicking}
        onExitReplay={exitReplay}
        onChangeSpeed={changeSpeed}
      />

      {/* Finished Overlay */}
      {showFinishedModal && (
        <ReplayFinished
          ticker={selectedTicker}
          currentCandle={currentCandle}
          onReplayAgain={resetToCutoff}
          onStayOnChart={dismissFinishedModal}
          onExitReplay={exitReplay}
        />
      )}
    </div>
  );
}
