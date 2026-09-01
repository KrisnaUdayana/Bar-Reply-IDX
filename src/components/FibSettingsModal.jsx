import { useState } from 'react';

export const DEFAULT_FIB_LEVELS = [
  // Column 1
  { id: '0', ratio: 0, color: '#787b86', enabled: true },
  { id: '0.382', ratio: 0.382, color: '#ff9800', enabled: true },
  { id: '0.618', ratio: 0.618, color: '#00bfa5', enabled: true },
  { id: '1', ratio: 1, color: '#787b86', enabled: true },
  { id: '2.618', ratio: 2.618, color: '#f43f5e', enabled: false },
  { id: '4.236', ratio: 4.236, color: '#9c27b0', enabled: false },
  { id: '1.414', ratio: 1.414, color: '#e91e63', enabled: false },
  { id: '2.414', ratio: 2.414, color: '#4caf50', enabled: false },
  { id: '3', ratio: 3, color: '#00bcd4', enabled: false },
  { id: '3.414', ratio: 3.414, color: '#2962ff', enabled: false },
  { id: '4.272', ratio: 4.272, color: '#8b5cf6', enabled: false },
  { id: '4.618', ratio: 4.618, color: '#ff9800', enabled: false },

  // Column 2
  { id: '0.236', ratio: 0.236, color: '#f43f5e', enabled: false },
  { id: '0.5', ratio: 0.5, color: '#4caf50', enabled: false },
  { id: '0.786', ratio: 0.786, color: '#00bcd4', enabled: true },
  { id: '1.618', ratio: 1.618, color: '#2962ff', enabled: false },
  { id: '3.618', ratio: 3.618, color: '#8b5cf6', enabled: false },
  { id: '1.272', ratio: 1.272, color: '#b78103', enabled: false },
  { id: '2.272', ratio: 2.272, color: '#b78103', enabled: false },
  { id: '2', ratio: 2, color: '#009688', enabled: false },
  { id: '3.272', ratio: 3.272, color: '#607d8b', enabled: false },
  { id: '4', ratio: 4, color: '#f43f5e', enabled: false },
  { id: '4.414', ratio: 4.414, color: '#e91e63', enabled: false },
  { id: '4.764', ratio: 4.764, color: '#009688', enabled: false },
];

/**
 * 1:1 TradingView Fibonacci Settings Modal Component.
 *
 * @param {{
 *   drawing: Object,
 *   onSave: (updatedSettings: Object) => void,
 *   onClose: () => void
 * }} props
 */
export default function FibSettingsModal({ drawing, onSave, onClose }) {
  const initialSettings = drawing.fibSettings || {
    levels: DEFAULT_FIB_LEVELS,
    useOneColor: false,
    singleColor: '#2962ff',
    showBackground: true,
    bgOpacity: 0.15,
  };

  const [levels, setLevels] = useState(initialSettings.levels);
  const [useOneColor, setUseOneColor] = useState(initialSettings.useOneColor);
  const [singleColor, setSingleColor] = useState(initialSettings.singleColor);
  const [showBackground, setShowBackground] = useState(initialSettings.showBackground);
  const [bgOpacity, setBgOpacity] = useState(initialSettings.bgOpacity);

  const col1 = levels.slice(0, 12);
  const col2 = levels.slice(12, 24);

  const handleToggleLevel = (index) => {
    setLevels(prev => {
      const next = [...prev];
      next[index] = { ...next[index], enabled: !next[index].enabled };
      return next;
    });
  };

  const handleRatioChange = (index, val) => {
    const num = parseFloat(val);
    setLevels(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ratio: isNaN(num) ? next[index].ratio : num };
      return next;
    });
  };

  const handleColorChange = (index, color) => {
    setLevels(prev => {
      const next = [...prev];
      next[index] = { ...next[index], color };
      return next;
    });
  };

  const handleSave = () => {
    onSave({
      levels,
      useOneColor,
      singleColor,
      showBackground,
      bgOpacity,
    });
    onClose();
  };

  return (
    <div className="tv-modal-overlay" onClick={onClose}>
      <div className="tv-modal" onClick={e => e.stopPropagation()}>
        <div className="tv-modal-header">
          <span className="tv-modal-title">Fib Retracement Settings</span>
          <button className="tv-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tv-modal-body">
          {/* 2-Column Fib Level Grid */}
          <div className="fib-levels-grid">
            {/* Column 1 */}
            <div className="fib-col">
              {col1.map((item, idx) => (
                <div key={item.id} className="fib-level-row">
                  <input
                    type="checkbox"
                    className="tv-checkbox"
                    checked={item.enabled}
                    onChange={() => handleToggleLevel(idx)}
                  />
                  <input
                    type="text"
                    className="tv-input fib-ratio-input"
                    value={item.ratio}
                    onChange={e => handleRatioChange(idx, e.target.value)}
                  />
                  <input
                    type="color"
                    className="tv-color-picker"
                    value={item.color}
                    onChange={e => handleColorChange(idx, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* Column 2 */}
            <div className="fib-col">
              {col2.map((item, idx) => {
                const globalIdx = idx + 12;
                return (
                  <div key={item.id} className="fib-level-row">
                    <input
                      type="checkbox"
                      className="tv-checkbox"
                      checked={item.enabled}
                      onChange={() => handleToggleLevel(globalIdx)}
                    />
                    <input
                      type="text"
                      className="tv-input fib-ratio-input"
                      value={item.ratio}
                      onChange={e => handleRatioChange(globalIdx, e.target.value)}
                    />
                    <input
                      type="color"
                      className="tv-color-picker"
                      value={item.color}
                      onChange={e => handleColorChange(globalIdx, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="tv-modal-divider" />

          {/* Bottom Settings Options */}
          <div className="fib-extra-options">
            <div className="fib-option-row">
              <label className="fib-checkbox-label">
                <input
                  type="checkbox"
                  className="tv-checkbox"
                  checked={useOneColor}
                  onChange={e => setUseOneColor(e.target.checked)}
                />
                <span>Use one color</span>
              </label>
              <input
                type="color"
                className="tv-color-picker"
                value={singleColor}
                onChange={e => setSingleColor(e.target.value)}
                disabled={!useOneColor}
              />
            </div>

            <div className="fib-option-row">
              <label className="fib-checkbox-label">
                <input
                  type="checkbox"
                  className="tv-checkbox"
                  checked={showBackground}
                  onChange={e => setShowBackground(e.target.checked)}
                />
                <span>Background</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="tv-range-slider"
                value={bgOpacity}
                onChange={e => setBgOpacity(parseFloat(e.target.value))}
                disabled={!showBackground}
              />
              <span className="tv-slider-val">{Math.round(bgOpacity * 100)}%</span>
            </div>
          </div>
        </div>

        <div className="tv-modal-footer">
          <button className="tv-btn tv-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="tv-btn tv-btn-ok" onClick={handleSave}>OK</button>
        </div>
      </div>
    </div>
  );
}
