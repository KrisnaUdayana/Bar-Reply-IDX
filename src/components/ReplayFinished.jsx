import { formatDate } from '../utils/replayUtils';

/**
 * Overlay displayed when replay reaches the last candle.
 */
export default function ReplayFinished({
  ticker,
  currentCandle,
  onReplayAgain,
  onStayOnChart,
  onExitReplay,
}) {
  return (
    <div className="replay-finished-overlay" onClick={onStayOnChart}>
      <div className="replay-finished-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onStayOnChart} title="Lihat Chart">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="finished-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h2 className="finished-title">Replay Selesai</h2>

        <div className="finished-details">
          <span className="finished-ticker">{ticker}</span>
          {currentCandle && (
            <span className="finished-range">
              Sampai: {formatDate(currentCandle.time)}
            </span>
          )}
        </div>

        <div className="finished-actions">
          <button
            className="btn btn-secondary"
            onClick={onStayOnChart}
          >
            Lihat Chart
          </button>
          <button
            className="btn btn-primary"
            onClick={onReplayAgain}
          >
            Replay Lagi
          </button>
          <button
            className="btn btn-outline"
            onClick={onExitReplay}
          >
            Keluar Replay
          </button>
        </div>
      </div>
    </div>
  );
}
