import { REPLAY_SPEEDS } from '../config/stocks';
import { formatDate } from '../utils/replayUtils';

/**
 * Replay control bar with play/pause, next, previous, reset, jump-to, speed, and exit buttons.
 */
export default function ReplayControls({
  mode,
  currentIndex,
  cutoffIndex,
  totalCandles,
  currentCandle,
  isPlaying,
  speed,
  onNext,
  onPrevious,
  onTogglePlay,
  onReset,
  onStartPicking,
  onExitReplay,
  onChangeSpeed,
}) {
  if (mode === 'normal') return null;

  if (mode === 'picking') {
    return (
      <div className="replay-controls picking-bar">
        <div className="picking-message">
          <span className="picking-icon">✂️</span>
          <span>Klik candle di chart tempat Anda ingin memulai Replay</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onExitReplay}>
          Batal
        </button>
      </div>
    );
  }

  const isAtCutoff = currentIndex === cutoffIndex;
  const isAtEnd = currentIndex >= totalCandles - 1;

  return (
    <div className="replay-controls">
      <div className="controls-row">
        {/* Re-select cutoff point / Jump to */}
        <button
          className="control-btn jump-btn"
          onClick={onStartPicking}
          title="Pilih Ulang Titik Replay (Klik Candle)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="12 8 8 12 12 16 12 8" />
          </svg>
          <span className="btn-label">Jump</span>
        </button>

        {/* Transport buttons */}
        <div className="transport-controls">
          <button
            className="control-btn reset-btn"
            onClick={onReset}
            title="Reset ke Titik Replay Awal"
            aria-label="Reset"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="19 20 9 12 19 4 19 20" />
              <line x1="5" y1="19" x2="5" y2="5" />
            </svg>
          </button>

          <button
            className="control-btn prev-btn"
            onClick={onPrevious}
            disabled={isAtCutoff}
            title="Previous Candle"
            aria-label="Previous candle"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="19 20 9 12 19 4 19 20" />
            </svg>
          </button>

          <button
            className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={onTogglePlay}
            disabled={isAtEnd}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            )}
          </button>

          <button
            className="control-btn next-btn"
            onClick={onNext}
            disabled={isAtEnd}
            title="Next Candle"
            aria-label="Next candle"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" />
            </svg>
          </button>
        </div>

        {/* Speed selector */}
        <div className="speed-controls">
          {REPLAY_SPEEDS.map((s) => (
            <button
              key={s}
              className={`speed-btn ${speed === s ? 'active' : ''}`}
              onClick={() => onChangeSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Exit Replay Mode button */}
        <button
          className="control-btn exit-btn"
          onClick={onExitReplay}
          title="Keluar dari Replay (Lihat Full Chart)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span className="btn-label">Keluar</span>
        </button>
      </div>

      {/* Info bar */}
      <div className="replay-info">
        <span className="replay-date">
          {currentCandle ? formatDate(currentCandle.time) : '—'}
        </span>
        <span className="replay-progress">
          Candle {currentIndex !== null ? currentIndex + 1 : 0} / {totalCandles}
        </span>
      </div>
    </div>
  );
}
