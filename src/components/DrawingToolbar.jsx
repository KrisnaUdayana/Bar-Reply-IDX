import { useState, useRef, useEffect } from 'react';

/**
 * Full TradingView-identical Left Drawing Toolbar with Flyout Popups (FORECASTING & LINES).
 *
 * @param {{
 *   activeTool: string,
 *   onSelectTool: (toolName: string) => void,
 *   onClearDrawings: () => void,
 *   drawingsCount: number
 * }} props
 */
export default function DrawingToolbar({
  activeTool,
  onSelectTool,
  onClearDrawings,
  drawingsCount = 0,
}) {
  const [activeFlyout, setActiveFlyout] = useState(null); // 'lines' | 'forecasting' | null
  const [isMagnetActive, setIsMagnetActive] = useState(false);
  const [isDrawingsHidden, setIsDrawingsHidden] = useState(false);
  const toolbarRef = useRef(null);

  // Close flyout menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setActiveFlyout(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToolClick = (toolName) => {
    onSelectTool(toolName);
    setActiveFlyout(null);
  };

  const toggleFlyout = (menuName) => {
    setActiveFlyout(prev => (prev === menuName ? null : menuName));
  };

  const lineTools = [
    'trendline', 'ray', 'infoline', 'extendedline', 'trendangle',
    'horizontalline', 'horizontalray', 'verticalline', 'crossline'
  ];

  const isLineActive = lineTools.includes(activeTool);
  const isForecastingActive = activeTool === 'long' || activeTool === 'short';

  return (
    <aside ref={toolbarRef} className="tv-drawing-toolbar">
      {/* Top Main Tools */}
      <div className="tv-toolbar-group top-group">
        {/* 1. Cursor / Crosshair */}
        <button
          className={`tv-tool-btn ${activeTool === 'cursor' ? 'active' : ''}`}
          onClick={() => handleToolClick('cursor')}
          title="Kursor / Crosshair"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
        </button>

        {/* 2. LINES Tools (Trendline, Horizontal line, Vertical line, etc.) */}
        <div className="tv-flyout-container">
          <button
            className={`tv-tool-btn ${isLineActive || activeFlyout === 'lines' ? 'active' : ''}`}
            onClick={() => toggleFlyout('lines')}
            title="Line Drawing Tools (Trendline, Horizontal line, etc.)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="5" cy="19" r="2" fill="currentColor" />
              <circle cx="19" cy="5" r="2" fill="currentColor" />
              <line x1="7" y1="17" x2="17" y2="7" />
            </svg>
            <span className="tv-flyout-arrow">‹</span>
          </button>

          {/* LINES Flyout Menu */}
          {activeFlyout === 'lines' && (
            <div className="tv-flyout-menu">
              <div className="tv-flyout-header">LINES</div>

              <button
                className={`tv-flyout-item ${activeTool === 'trendline' ? 'selected' : ''}`}
                onClick={() => handleToolClick('trendline')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="tv-item-icon">
                  <circle cx="5" cy="19" r="2" fill="currentColor" />
                  <circle cx="19" cy="5" r="2" fill="currentColor" />
                  <line x1="7" y1="17" x2="17" y2="7" />
                </svg>
                <span>Trendline</span>
                <span className="tv-hotkey">Alt + T</span>
              </button>

              <button
                className={`tv-flyout-item ${activeTool === 'ray' ? 'selected' : ''}`}
                onClick={() => handleToolClick('ray')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="tv-item-icon">
                  <circle cx="5" cy="19" r="2" fill="currentColor" />
                  <line x1="7" y1="17" x2="21" y2="3" />
                </svg>
                <span>Ray</span>
              </button>

              <button
                className={`tv-flyout-item ${activeTool === 'infoline' ? 'selected' : ''}`}
                onClick={() => handleToolClick('infoline')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="tv-item-icon">
                  <circle cx="5" cy="19" r="2" fill="currentColor" />
                  <circle cx="17" cy="7" r="2" fill="currentColor" />
                  <line x1="7" y1="17" x2="15" y2="9" />
                  <rect x="15" y="15" width="6" height="5" rx="1" fill="none" stroke="currentColor" />
                </svg>
                <span>Info line</span>
              </button>

              <button
                className={`tv-flyout-item ${activeTool === 'extendedline' ? 'selected' : ''}`}
                onClick={() => handleToolClick('extendedline')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="tv-item-icon">
                  <line x1="2" y1="22" x2="22" y2="2" />
                  <circle cx="8" cy="16" r="2" fill="currentColor" />
                  <circle cx="16" cy="8" r="2" fill="currentColor" />
                </svg>
                <span>Extended line</span>
              </button>

              <button
                className={`tv-flyout-item ${activeTool === 'trendangle' ? 'selected' : ''}`}
                onClick={() => handleToolClick('trendangle')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="tv-item-icon">
                  <line x1="4" y1="20" x2="20" y2="20" />
                  <line x1="4" y1="20" x2="18" y2="6" />
                  <path d="M12 20a8 8 0 0 0-4-7" />
                </svg>
                <span>Trend angle</span>
              </button>

              <button
                className={`tv-flyout-item ${activeTool === 'horizontalline' ? 'selected' : ''}`}
                onClick={() => handleToolClick('horizontalline')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="tv-item-icon">
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
                <span>Horizontal line</span>
                <span className="tv-hotkey">Alt + H</span>
              </button>

              <button
                className={`tv-flyout-item ${activeTool === 'horizontalray' ? 'selected' : ''}`}
                onClick={() => handleToolClick('horizontalray')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="tv-item-icon">
                  <circle cx="6" cy="12" r="2" fill="currentColor" />
                  <line x1="8" y1="12" x2="22" y2="12" />
                </svg>
                <span>Horizontal ray</span>
                <span className="tv-hotkey">Alt + J</span>
              </button>

              <button
                className={`tv-flyout-item ${activeTool === 'verticalline' ? 'selected' : ''}`}
                onClick={() => handleToolClick('verticalline')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="tv-item-icon">
                  <line x1="12" y1="2" x2="12" y2="22" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
                <span>Vertical line</span>
                <span className="tv-hotkey">Alt + V</span>
              </button>

              <button
                className={`tv-flyout-item ${activeTool === 'crossline' ? 'selected' : ''}`}
                onClick={() => handleToolClick('crossline')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="tv-item-icon">
                  <line x1="12" y1="2" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
                <span>Crossline</span>
                <span className="tv-hotkey">Alt + C</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Gann & Fibonacci */}
        <button
          className="tv-tool-btn"
          onClick={() => handleToolClick('cursor')}
          title="Gann and Fibonacci Tools"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
            <circle cx="7" cy="6" r="2" fill="currentColor" />
            <circle cx="14" cy="12" r="2" fill="currentColor" />
          </svg>
        </button>

        {/* 4. Geometric Shapes & Patterns */}
        <button
          className="tv-tool-btn"
          onClick={() => handleToolClick('cursor')}
          title="Geometric Shapes & Patterns"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polygon points="12 2 2 22 22 22" />
            <circle cx="12" cy="14" r="2" fill="currentColor" />
          </svg>
        </button>

        {/* 5. Forecasting (Long Position & Short Position) */}
        <div className="tv-flyout-container">
          <button
            className={`tv-tool-btn ${isForecastingActive || activeFlyout === 'forecasting' ? 'active' : ''}`}
            onClick={() => toggleFlyout('forecasting')}
            title="Prediction & Measurement (Long/Short Position)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="3" y1="8" x2="21" y2="8" />
              <line x1="3" y1="16" x2="21" y2="16" />
              <circle cx="6" cy="8" r="2" fill="currentColor" />
              <circle cx="18" cy="16" r="2" fill="currentColor" />
              <line x1="6" y1="10" x2="6" y2="14" strokeDasharray="2 2" />
              <line x1="18" y1="10" x2="18" y2="14" strokeDasharray="2 2" />
            </svg>
            <span className="tv-flyout-arrow">‹</span>
          </button>

          {/* Forecasting Flyout Menu */}
          {activeFlyout === 'forecasting' && (
            <div className="tv-flyout-menu">
              <div className="tv-flyout-header">FORECASTING</div>

              <button
                className={`tv-flyout-item ${activeTool === 'long' ? 'selected' : ''}`}
                onClick={() => handleToolClick('long')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="tv-item-icon">
                  <line x1="4" y1="8" x2="20" y2="8" />
                  <line x1="4" y1="16" x2="20" y2="16" />
                  <circle cx="8" cy="8" r="2" fill="currentColor" />
                </svg>
                <span>Long position</span>
              </button>

              <button
                className={`tv-flyout-item ${activeTool === 'short' ? 'selected' : ''}`}
                onClick={() => handleToolClick('short')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="tv-item-icon">
                  <line x1="4" y1="8" x2="20" y2="8" />
                  <line x1="4" y1="16" x2="20" y2="16" />
                  <circle cx="8" cy="16" r="2" fill="currentColor" />
                </svg>
                <span>Short position</span>
              </button>
            </div>
          )}
        </div>

        {/* 6. Brush / Drawing */}
        <button
          className="tv-tool-btn"
          onClick={() => handleToolClick('cursor')}
          title="Brush / Drawing Tools"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          </svg>
        </button>

        {/* 7. Text */}
        <button
          className="tv-tool-btn"
          onClick={() => handleToolClick('cursor')}
          title="Text Tools"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7V4h16v3M9 4v16M15 4v16" />
          </svg>
        </button>

        {/* 8. Emoji / Icons */}
        <button
          className="tv-tool-btn"
          onClick={() => handleToolClick('cursor')}
          title="Icons / Emojis"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
            <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
          </svg>
        </button>

        {/* 9. Price Range / Ruler */}
        <button
          className={`tv-tool-btn ${activeTool === 'ruler' ? 'active' : ''}`}
          onClick={() => handleToolClick('ruler')}
          title="Measure / Price Range (Ruler)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 12h20M6 8v8M10 9v6M14 9v6M18 8v8" />
          </svg>
        </button>

        {/* 10. Zoom In */}
        <button
          className="tv-tool-btn"
          onClick={() => handleToolClick('cursor')}
          title="Zoom In"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
      </div>

      {/* Bottom Utility Tools */}
      <div className="tv-toolbar-group bottom-group">
        {/* Magnet Mode */}
        <button
          className={`tv-tool-btn ${isMagnetActive ? 'active' : ''}`}
          onClick={() => setIsMagnetActive(!isMagnetActive)}
          title="Magnet Mode"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 15v-3a6 6 0 1 1 12 0v3" />
            <path d="M6 15H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v-6z" />
            <path d="M18 15h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2v-6z" />
          </svg>
        </button>

        {/* Hide / Show Drawings */}
        <button
          className={`tv-tool-btn ${isDrawingsHidden ? 'active' : ''}`}
          onClick={() => setIsDrawingsHidden(!isDrawingsHidden)}
          title={isDrawingsHidden ? 'Tampilkan Gambar' : 'Sembunyikan Gambar'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>

        {/* Clear / Trash */}
        <button
          className="tv-tool-btn trash-btn"
          onClick={onClearDrawings}
          disabled={drawingsCount === 0}
          title={drawingsCount > 0 ? `Hapus Semua Gambar (${drawingsCount})` : 'Belum Ada Gambar'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          {drawingsCount > 0 && <span className="tv-drawings-count">{drawingsCount}</span>}
        </button>
      </div>
    </aside>
  );
}
