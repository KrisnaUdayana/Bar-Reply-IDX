import { useState, useEffect, useMemo, useCallback } from "react";
import { STOCKS } from "../config/stocks";
import { loadStockData } from "../utils/dataLoader";
import { aggregateToWeekly, aggregateToMonthly, aggregateToNHours } from "../utils/timeframeUtils";
import { useReplayEngine } from "../hooks/useReplayEngine";
import CandlestickChart from "./CandlestickChart";
import ReplayControls from "./ReplayControls";
import ReplayFinished from "./ReplayFinished";
import DrawingToolbar from "./DrawingToolbar";

/**
 * Main trading view workspace component.
 * Allows viewing full chart history first, then picking replay point on chart.
 */
export default function ReplayScreen() {
  const [selectedTicker, setSelectedTicker] = useState(STOCKS[0].ticker);
  const [timeframe, setTimeframe] = useState("1D");
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Drawing Toolbar State
  const [activeTool, setActiveTool] = useState("cursor");
  const [drawings, setDrawings] = useState([]);

  const handleAddDrawing = useCallback((newDrawing) => {
    setDrawings((prev) => [...prev, newDrawing]);
  }, []);

  const handleUpdateDrawing = useCallback((id, updatedProps) => {
    setDrawings((prev) => prev.map((d) => (d.id === id ? { ...d, ...updatedProps } : d)));
  }, []);

  const handleRemoveDrawing = useCallback((id) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleClearDrawings = useCallback(() => {
    setDrawings([]);
  }, []);

  const isHourlyTimeframe = ["1H", "2H", "3H", "4H"].includes(timeframe);
  const dataInterval = isHourlyTimeframe ? "1h" : "1d";

  // Transform data based on active timeframe (1H, 2H, 3H, 4H, 1D, 1W, 1M)
  const activeData = useMemo(() => {
    if (!stockData) return null;
    if (timeframe === "1H") return stockData;
    if (timeframe === "2H") return aggregateToNHours(stockData, 2);
    if (timeframe === "3H") return aggregateToNHours(stockData, 3);
    if (timeframe === "4H") return aggregateToNHours(stockData, 4);
    if (timeframe === "1W") return aggregateToWeekly(stockData);
    if (timeframe === "1M") return aggregateToMonthly(stockData);
    return stockData;
  }, [stockData, timeframe]);

  // Fetch full stock data when ticker or interval changes
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const data = await loadStockData(selectedTicker, dataInterval);
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
    return () => {
      cancelled = true;
    };
  }, [selectedTicker, dataInterval]);

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
  } = useReplayEngine(activeData);

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
            <select className="ticker-select" value={selectedTicker} onChange={(e) => setSelectedTicker(e.target.value)}>
              {STOCKS.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.ticker} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="timeframe-selector">
            <button className={`timeframe-btn ${timeframe === "1H" ? "active" : ""}`} onClick={() => setTimeframe("1H")} title="Timeframe 1 Jam">
              1H
            </button>
            <button className={`timeframe-btn ${timeframe === "2H" ? "active" : ""}`} onClick={() => setTimeframe("2H")} title="Timeframe 2 Jam">
              2H
            </button>
            <button className={`timeframe-btn ${timeframe === "3H" ? "active" : ""}`} onClick={() => setTimeframe("3H")} title="Timeframe 3 Jam">
              3H
            </button>
            <button className={`timeframe-btn ${timeframe === "4H" ? "active" : ""}`} onClick={() => setTimeframe("4H")} title="Timeframe 4 Jam">
              4H
            </button>
            <div className="timeframe-divider" />
            <button className={`timeframe-btn ${timeframe === "1D" ? "active" : ""}`} onClick={() => setTimeframe("1D")} title="Timeframe Harian (Daily)">
              1D
            </button>
            <button className={`timeframe-btn ${timeframe === "1W" ? "active" : ""}`} onClick={() => setTimeframe("1W")} title="Timeframe Mingguan (Weekly)">
              1W
            </button>
            <button className={`timeframe-btn ${timeframe === "1M" ? "active" : ""}`} onClick={() => setTimeframe("1M")} title="Timeframe Bulanan (Monthly)">
              1M
            </button>
          </div>
        </div>

        <div className="header-right">
          {mode === "normal" && (
            <button className="btn-bar-replay" onClick={startPicking} title="Aktifkan Replay mode & pilih candle pada chart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="12 8 8 12 12 16 12 8" />
              </svg>
              <span>Bar Replay</span>
            </button>
          )}

          {mode === "picking" && <span className="header-status-badge picking">✂️ Klik candle pada chart...</span>}

          {mode === "replaying" && <span className="header-status-badge active">🔴 Replay Mode</span>}
        </div>
      </header>

      {/* Main Chart Area */}
      <main className="workspace-main">
        <DrawingToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onClearDrawings={handleClearDrawings}
          drawingsCount={drawings.length}
        />

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
            timeframe={timeframe}
            isPicking={mode === "picking"}
            onSelectCandleTime={selectCutoffByTime}
            activeTool={activeTool}
            drawings={drawings}
            onAddDrawing={handleAddDrawing}
            onUpdateDrawing={handleUpdateDrawing}
            onRemoveDrawing={handleRemoveDrawing}
            onToolUsed={() => setActiveTool("cursor")}
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
      {showFinishedModal && <ReplayFinished ticker={selectedTicker} currentCandle={currentCandle} onReplayAgain={resetToCutoff} onStayOnChart={dismissFinishedModal} onExitReplay={exitReplay} />}
    </div>
  );
}
