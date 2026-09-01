import { useState, useEffect, useRef, useCallback } from 'react';
import FibSettingsModal, { DEFAULT_FIB_LEVELS } from './FibSettingsModal';

/**
 * 1:1 TradingView Position, Lines, & Fibonacci Overlay Component.
 * Supports: Long/Short position, Ruler, Trendline, Ray, Horizontal Line, Vertical Line, Horizontal Ray, Crossline, Fib Retracement, & Fib Settings Modal.
 *
 * @param {{
 *   chartRef: React.RefObject,
 *   seriesRef: React.RefObject,
 *   activeTool: string,
 *   drawings: Array,
 *   onAddDrawing: (drawing: Object) => void,
 *   onUpdateDrawing: (id: string, updated: Object) => void,
 *   onRemoveDrawing: (id: string) => void,
 *   onToolUsed: () => void
 * }} props
 */
export default function DrawingOverlay({
  chartRef,
  seriesRef,
  activeTool,
  drawings = [],
  onAddDrawing,
  onUpdateDrawing,
  onRemoveDrawing,
  onToolUsed,
}) {
  const containerRef = useRef(null);
  const [, setRenderTrigger] = useState(0);
  const [rulerDraft, setRulerDraft] = useState(null);
  const [lineDraft, setLineDraft] = useState(null);
  const [editingFibDrawing, setEditingFibDrawing] = useState(null);

  // 60 FPS animation loop to keep SVG overlay perfectly synced during pan, scroll, zoom, and price scale drags
  useEffect(() => {
    let animId;
    const updateLoop = () => {
      setRenderTrigger(prev => (prev + 1) % 1000);
      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  // Helper to convert price to pixel Y coordinate
  const priceToY = useCallback((price) => {
    if (!seriesRef.current || price == null) return null;
    try {
      return seriesRef.current.priceToCoordinate(price);
    } catch (e) {
      return null;
    }
  }, [seriesRef]);

  // Helper to convert pixel Y coordinate to price
  const yToPrice = useCallback((y) => {
    if (!seriesRef.current || y == null) return null;
    try {
      const price = seriesRef.current.coordinateToPrice(y);
      return price ? Math.round(price) : null;
    } catch (e) {
      return null;
    }
  }, [seriesRef]);

  // Helper to convert pixel X coordinate to logical candle index
  const xToLogical = useCallback((x) => {
    if (!chartRef.current || x == null) return null;
    try {
      return chartRef.current.timeScale().coordinateToLogical(x);
    } catch (e) {
      return null;
    }
  }, [chartRef]);

  // Helper to convert logical candle index to pixel X coordinate
  const logicalToX = useCallback((logical) => {
    if (!chartRef.current || logical == null) return null;
    try {
      return chartRef.current.timeScale().logicalToCoordinate(logical);
    } catch (e) {
      return null;
    }
  }, [chartRef]);

  // Handle overlay click to add new drawing
  const handleContainerClick = (e) => {
    if (activeTool === 'cursor') return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clickedPrice = yToPrice(clickY);
    if (clickedPrice == null) return;

    const clickedLogical = xToLogical(clickX) ?? 0;
    const defaultBarsCount = 15;

    // ─── 1-CLICK LINE TOOLS ───
    if (activeTool === 'horizontalline') {
      onAddDrawing({
        id: Date.now().toString(),
        type: 'horizontalline',
        price1: clickedPrice,
      });
      if (onToolUsed) onToolUsed();
      return;
    }

    if (activeTool === 'verticalline') {
      onAddDrawing({
        id: Date.now().toString(),
        type: 'verticalline',
        startLogical: clickedLogical,
      });
      if (onToolUsed) onToolUsed();
      return;
    }

    if (activeTool === 'horizontalray') {
      onAddDrawing({
        id: Date.now().toString(),
        type: 'horizontalray',
        price1: clickedPrice,
        startLogical: clickedLogical,
      });
      if (onToolUsed) onToolUsed();
      return;
    }

    if (activeTool === 'crossline') {
      onAddDrawing({
        id: Date.now().toString(),
        type: 'crossline',
        price1: clickedPrice,
        startLogical: clickedLogical,
      });
      if (onToolUsed) onToolUsed();
      return;
    }

    // ─── 2-CLICK TOOLS ───
    const twoClickTools = [
      'trendline', 'ray', 'infoline', 'extendedline', 'trendangle',
      'fibretracement', 'fibextension'
    ];

    if (twoClickTools.includes(activeTool)) {
      if (!lineDraft) {
        setLineDraft({
          tool: activeTool,
          price1: clickedPrice,
          startLogical: clickedLogical,
          price2: clickedPrice,
          endLogical: clickedLogical + 10,
        });
      } else {
        onAddDrawing({
          id: Date.now().toString(),
          type: lineDraft.tool,
          price1: lineDraft.price1,
          startLogical: lineDraft.startLogical,
          price2: clickedPrice,
          endLogical: clickedLogical,
          fibSettings: {
            levels: DEFAULT_FIB_LEVELS,
            useOneColor: false,
            singleColor: '#2962ff',
            showBackground: true,
            bgOpacity: 0.15,
          },
        });
        setLineDraft(null);
        if (onToolUsed) onToolUsed();
      }
      return;
    }

    // ─── FORECASTING TOOLS ───
    if (activeTool === 'long') {
      const entryPrice = clickedPrice;
      const tpPrice = Math.round(entryPrice * 1.05); // +5%
      const slPrice = Math.round(entryPrice * 0.975); // -2.5%
      const newDrawing = {
        id: Date.now().toString(),
        type: 'long',
        entryPrice,
        tpPrice,
        slPrice,
        startLogical: clickedLogical,
        barsCount: defaultBarsCount,
        x: Math.max(20, clickX - 80),
        width: 260,
      };
      onAddDrawing(newDrawing);
      if (onToolUsed) onToolUsed();
    } else if (activeTool === 'short') {
      const entryPrice = clickedPrice;
      const tpPrice = Math.round(entryPrice * 0.95); // -5%
      const slPrice = Math.round(entryPrice * 1.025); // +2.5%
      const newDrawing = {
        id: Date.now().toString(),
        type: 'short',
        entryPrice,
        tpPrice,
        slPrice,
        startLogical: clickedLogical,
        barsCount: defaultBarsCount,
        x: Math.max(20, clickX - 80),
        width: 260,
      };
      onAddDrawing(newDrawing);
      if (onToolUsed) onToolUsed();
    } else if (activeTool === 'ruler') {
      if (!rulerDraft) {
        setRulerDraft({
          x1: clickX,
          y1: clickY,
          price1: clickedPrice,
          startLogical: clickedLogical,
          x2: clickX + 100,
          y2: clickY - 50,
          price2: yToPrice(clickY - 50) || clickedPrice * 1.02,
        });
      } else {
        onAddDrawing({
          id: Date.now().toString(),
          type: 'ruler',
          x1: rulerDraft.x1,
          price1: rulerDraft.price1,
          startLogical: rulerDraft.startLogical,
          endLogical: clickedLogical,
          x2: clickX,
          price2: clickedPrice,
        });
        setRulerDraft(null);
        if (onToolUsed) onToolUsed();
      }
    }
  };

  // Mouse move handler for live line draft
  const handleMouseMoveDraft = (e) => {
    if (!lineDraft || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const currentPrice = yToPrice(clickY);
    const currentLogical = xToLogical(clickX);

    if (currentPrice != null && currentLogical != null) {
      setLineDraft(prev => ({
        ...prev,
        price2: currentPrice,
        endLogical: currentLogical,
      }));
    }
  };

  // Global window drag handler for smooth handle dragging
  const startDragging = (e, drawing, handleType) => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const initialDrawing = { ...drawing };

    const startMouseX = e.clientX - rect.left;
    const startMouseLogical = xToLogical(startMouseX) ?? 0;

    const handleWindowMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      const currentMouseY = moveEvent.clientY - rect.top;
      const currentMouseX = moveEvent.clientX - rect.left;

      const currentPrice = yToPrice(currentMouseY);
      if (currentPrice == null) return;

      if (handleType === 'tp') {
        onUpdateDrawing(drawing.id, { tpPrice: currentPrice });
      } else if (handleType === 'sl') {
        onUpdateDrawing(drawing.id, { slPrice: currentPrice });
      } else if (handleType === 'entry') {
        const priceDiff = currentPrice - initialDrawing.entryPrice;
        const updates = {
          entryPrice: currentPrice,
          tpPrice: initialDrawing.tpPrice + priceDiff,
          slPrice: initialDrawing.slPrice + priceDiff,
        };

        if (initialDrawing.startLogical != null) {
          const currentLogical = xToLogical(currentMouseX);
          if (currentLogical != null) {
            const logicalDiff = currentLogical - startMouseLogical;
            updates.startLogical = initialDrawing.startLogical + logicalDiff;
          }
        }

        onUpdateDrawing(drawing.id, updates);
      } else if (handleType === 'width') {
        if (initialDrawing.startLogical != null) {
          const currentLogical = xToLogical(currentMouseX);
          if (currentLogical != null) {
            const newBarsCount = Math.max(2, currentLogical - initialDrawing.startLogical);
            onUpdateDrawing(drawing.id, { barsCount: newBarsCount });
          }
        } else {
          const newWidth = Math.max(80, currentMouseX - initialDrawing.x);
          onUpdateDrawing(drawing.id, { width: newWidth });
        }
      } else if (handleType === 'p1') {
        const currentLogical = xToLogical(currentMouseX);
        onUpdateDrawing(drawing.id, {
          price1: currentPrice,
          startLogical: currentLogical ?? initialDrawing.startLogical,
        });
      } else if (handleType === 'p2') {
        const currentLogical = xToLogical(currentMouseX);
        onUpdateDrawing(drawing.id, {
          price2: currentPrice,
          endLogical: currentLogical ?? initialDrawing.endLogical,
        });
      }
    };

    const handleWindowMouseUp = () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
  };

  const hs = 8;
  const hitboxSize = 20;

  return (
    <div
      ref={containerRef}
      className={`drawing-overlay ${activeTool !== 'cursor' ? 'interactive-tool-mode' : ''}`}
      onClick={handleContainerClick}
      onMouseMove={handleMouseMoveDraft}
    >
      <svg className="overlay-svg">
        {drawings.map((drawing) => {
          // ─── 1. FIBONACCI RETRACEMENT ───
          if (drawing.type === 'fibretracement') {
            const x1 = logicalToX(drawing.startLogical);
            const x2 = logicalToX(drawing.endLogical);
            const p1 = drawing.price1;
            const p2 = drawing.price2;

            if (x1 == null || x2 == null || p1 == null || p2 == null) return null;

            const leftX = Math.min(x1, x2);
            const rightX = Math.max(x1, x2);

            const settings = drawing.fibSettings || {
              levels: DEFAULT_FIB_LEVELS,
              useOneColor: false,
              singleColor: '#2962ff',
              showBackground: true,
              bgOpacity: 0.15,
            };

            const activeLevels = (settings.levels || DEFAULT_FIB_LEVELS)
              .filter(l => l.enabled)
              .sort((a, b) => a.ratio - b.ratio);

            const computedLevels = activeLevels.map(item => {
              const priceAtRatio = p1 + (p2 - p1) * item.ratio;
              const y = priceToY(priceAtRatio);
              const color = settings.useOneColor ? settings.singleColor : item.color;
              return { ...item, color, price: Math.round(priceAtRatio), y };
            });

            return (
              <g key={drawing.id} className="fib-group">
                {/* Diagonal trend connecting line */}
                <line x1={x1} y1={priceToY(p1)} x2={x2} y2={priceToY(p2)} stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 3" />

                {/* Shaded ratio background bands */}
                {settings.showBackground && computedLevels.map((lvl, i) => {
                  if (i === 0 || lvl.y == null) return null;
                  const prevLvl = computedLevels[i - 1];
                  if (prevLvl.y == null) return null;

                  const topY = Math.min(prevLvl.y, lvl.y);
                  const bandHeight = Math.abs(prevLvl.y - lvl.y);

                  return (
                    <rect
                      key={`band-${i}`}
                      x={leftX}
                      y={topY}
                      width={Math.max(20, rightX - leftX)}
                      height={Math.max(1, bandHeight)}
                      fill={lvl.color}
                      fillOpacity={settings.bgOpacity ?? 0.15}
                    />
                  );
                })}

                {/* Level horizontal lines & text labels */}
                {computedLevels.map((lvl, i) => {
                  if (lvl.y == null) return null;

                  return (
                    <g key={`level-${i}`}>
                      <line x1={leftX} y1={lvl.y} x2={rightX} y2={lvl.y} stroke={lvl.color} strokeWidth="1.5" />
                      <foreignObject x={leftX + 6} y={lvl.y - 12} width="160" height="24" style={{ pointerEvents: 'none' }}>
                        <div className="tv-fib-badge" style={{ color: lvl.color, pointerEvents: 'none' }}>
                          <span>{lvl.ratio} ({lvl.price.toLocaleString('id-ID')})</span>
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}

                {/* Point 1 Handle */}
                <g style={{ cursor: 'pointer', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, 'p1')}>
                  <rect x={x1 - hitboxSize / 2} y={priceToY(p1) - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x1 - hs / 2} y={priceToY(p1) - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                {/* Point 2 Handle */}
                <g style={{ cursor: 'pointer', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, 'p2')}>
                  <rect x={x2 - hitboxSize / 2} y={priceToY(p2) - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x2 - hs / 2} y={priceToY(p2) - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                {/* Settings Gear Button ⚙️ & Delete Button ✕ */}
                <g
                  className="delete-icon"
                  transform={`translate(${rightX + 10}, ${priceToY(p2) - 10})`}
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                >
                  {/* Gear ⚙️ Settings button */}
                  <g onClick={(e) => {
                    e.stopPropagation();
                    setEditingFibDrawing(drawing);
                  }}>
                    <circle cx="-14" cy="10" r="10" fill="#1e1e2d" stroke="rgba(255,255,255,0.4)" />
                    <text x="-18" y="14" fill="#3b82f6" fontSize="11">⚙️</text>
                  </g>

                  {/* Delete ✕ button */}
                  <g onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDrawing(drawing.id);
                  }}>
                    <circle cx="10" cy="10" r="10" fill="#1e1e2d" stroke="rgba(255,255,255,0.4)" />
                    <text x="6.5" y="13.5" fill="#f43f5e" fontSize="11" fontWeight="bold">✕</text>
                  </g>
                </g>
              </g>
            );
          }

          // ─── 2. FIBONACCI EXTENSION ───
          if (drawing.type === 'fibextension') {
            const x1 = logicalToX(drawing.startLogical);
            const x2 = logicalToX(drawing.endLogical);
            const p1 = drawing.price1;
            const p2 = drawing.price2;

            if (x1 == null || x2 == null || p1 == null || p2 == null) return null;

            const leftX = Math.min(x1, x2);
            const rightX = Math.max(x1, x2);

            const extRatios = [
              { ratio: 0.618, color: '#2962ff', label: '0.618' },
              { ratio: 1.0, color: '#787b86', label: '1.0' },
              { ratio: 1.618, color: '#10b981', label: '1.618' },
              { ratio: 2.618, color: '#f59e0b', label: '2.618' },
            ];

            const computedLevels = extRatios.map(item => {
              const priceAtRatio = p1 + (p2 - p1) * item.ratio;
              const y = priceToY(priceAtRatio);
              return { ...item, price: Math.round(priceAtRatio), y };
            });

            return (
              <g key={drawing.id} className="fib-group">
                <line x1={x1} y1={priceToY(p1)} x2={x2} y2={priceToY(p2)} stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 3" />

                {computedLevels.map((lvl, i) => {
                  if (lvl.y == null) return null;

                  return (
                    <g key={`ext-${i}`}>
                      <line x1={leftX} y1={lvl.y} x2={rightX} y2={lvl.y} stroke={lvl.color} strokeWidth="1.5" strokeDasharray="4 2" />
                      <foreignObject x={leftX + 6} y={lvl.y - 12} width="160" height="24" style={{ pointerEvents: 'none' }}>
                        <div className="tv-fib-badge" style={{ color: lvl.color, pointerEvents: 'none' }}>
                          <span>{lvl.label} ({lvl.price.toLocaleString('id-ID')})</span>
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}

                {/* Point 1 Handle */}
                <g style={{ cursor: 'pointer', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, 'p1')}>
                  <rect x={x1 - hitboxSize / 2} y={priceToY(p1) - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x1 - hs / 2} y={priceToY(p1) - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                {/* Point 2 Handle */}
                <g style={{ cursor: 'pointer', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, 'p2')}>
                  <rect x={x2 - hitboxSize / 2} y={priceToY(p2) - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x2 - hs / 2} y={priceToY(p2) - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                {/* Delete Button */}
                <g
                  className="delete-icon"
                  transform={`translate(${rightX + 10}, ${priceToY(p2) - 10})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDrawing(drawing.id);
                  }}
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                >
                  <circle cx="10" cy="10" r="10" fill="#1e1e2d" stroke="rgba(255,255,255,0.4)" />
                  <text x="6.5" y="13.5" fill="#f43f5e" fontSize="11" fontWeight="bold">✕</text>
                </g>
              </g>
            );
          }

          // ─── 3. HORIZONTAL LINE ───
          if (drawing.type === 'horizontalline') {
            const y = priceToY(drawing.price1);
            if (y == null) return null;

            return (
              <g key={drawing.id} className="line-group">
                <line x1="0" y1={y} x2="100%" y2={y} stroke="#2962ff" strokeWidth="2" strokeDasharray="6 4" />

                {/* Price Badge on scale */}
                <foreignObject x="90%" y={y - 12} width="100" height="24" style={{ pointerEvents: 'none' }}>
                  <div className="tv-line-badge blue">
                    <span>{drawing.price1.toLocaleString('id-ID')}</span>
                  </div>
                </foreignObject>

                {/* Delete Button */}
                <g
                  className="delete-icon"
                  transform={`translate(30, ${y - 10})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDrawing(drawing.id);
                  }}
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                >
                  <circle cx="10" cy="10" r="10" fill="#1e1e2d" stroke="rgba(255,255,255,0.4)" />
                  <text x="6.5" y="13.5" fill="#f43f5e" fontSize="11" fontWeight="bold">✕</text>
                </g>
              </g>
            );
          }

          // ─── 4. VERTICAL LINE ───
          if (drawing.type === 'verticalline') {
            const x = logicalToX(drawing.startLogical);
            if (x == null) return null;

            return (
              <g key={drawing.id} className="line-group">
                <line x1={x} y1="0" x2={x} y2="100%" stroke="#2962ff" strokeWidth="2" strokeDasharray="6 4" />

                {/* Delete Button */}
                <g
                  className="delete-icon"
                  transform={`translate(${x - 10}, 30)`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDrawing(drawing.id);
                  }}
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                >
                  <circle cx="10" cy="10" r="10" fill="#1e1e2d" stroke="rgba(255,255,255,0.4)" />
                  <text x="6.5" y="13.5" fill="#f43f5e" fontSize="11" fontWeight="bold">✕</text>
                </g>
              </g>
            );
          }

          // ─── 5. HORIZONTAL RAY ───
          if (drawing.type === 'horizontalray') {
            const y = priceToY(drawing.price1);
            const x = logicalToX(drawing.startLogical);
            if (y == null || x == null) return null;

            return (
              <g key={drawing.id} className="line-group">
                <line x1={x} y1={y} x2="100%" y2={y} stroke="#2962ff" strokeWidth="2" />
                <rect x={x - hs / 2} y={y - hs / 2} width={hs} height={hs} className="tv-handle-square" />

                {/* Delete Button */}
                <g
                  className="delete-icon"
                  transform={`translate(${x + 20}, ${y - 10})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDrawing(drawing.id);
                  }}
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                >
                  <circle cx="10" cy="10" r="10" fill="#1e1e2d" stroke="rgba(255,255,255,0.4)" />
                  <text x="6.5" y="13.5" fill="#f43f5e" fontSize="11" fontWeight="bold">✕</text>
                </g>
              </g>
            );
          }

          // ─── 6. CROSSLINE ───
          if (drawing.type === 'crossline') {
            const y = priceToY(drawing.price1);
            const x = logicalToX(drawing.startLogical);
            if (y == null || x == null) return null;

            return (
              <g key={drawing.id} className="line-group">
                <line x1="0" y1={y} x2="100%" y2={y} stroke="#2962ff" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1={x} y1="0" x2={x} y2="100%" stroke="#2962ff" strokeWidth="1.5" strokeDasharray="4 4" />
                <circle cx={x} cy={y} r="4" fill="#2962ff" stroke="#ffffff" strokeWidth="1" />

                {/* Delete Button */}
                <g
                  className="delete-icon"
                  transform={`translate(${x + 12}, ${y - 10})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDrawing(drawing.id);
                  }}
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                >
                  <circle cx="10" cy="10" r="10" fill="#1e1e2d" stroke="rgba(255,255,255,0.4)" />
                  <text x="6.5" y="13.5" fill="#f43f5e" fontSize="11" fontWeight="bold">✕</text>
                </g>
              </g>
            );
          }

          // ─── 7. TRENDLINE / RAY / EXTENDED LINE / INFO LINE ───
          if (['trendline', 'ray', 'infoline', 'extendedline', 'trendangle'].includes(drawing.type)) {
            const y1 = priceToY(drawing.price1);
            const y2 = priceToY(drawing.price2);
            const x1 = logicalToX(drawing.startLogical);
            const x2 = logicalToX(drawing.endLogical);

            if (y1 == null || y2 == null || x1 == null || x2 == null) return null;

            return (
              <g key={drawing.id} className="line-group">
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2962ff" strokeWidth="2" />

                {/* Point 1 Handle */}
                <g style={{ cursor: 'pointer', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, 'p1')}>
                  <rect x={x1 - hitboxSize / 2} y={y1 - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x1 - hs / 2} y={y1 - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                {/* Point 2 Handle */}
                <g style={{ cursor: 'pointer', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, 'p2')}>
                  <rect x={x2 - hitboxSize / 2} y={y2 - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x2 - hs / 2} y={y2 - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                {/* Delete Button */}
                <g
                  className="delete-icon"
                  transform={`translate(${x2 + 10}, ${y2 - 10})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDrawing(drawing.id);
                  }}
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                >
                  <circle cx="10" cy="10" r="10" fill="#1e1e2d" stroke="rgba(255,255,255,0.4)" />
                  <text x="6.5" y="13.5" fill="#f43f5e" fontSize="11" fontWeight="bold">✕</text>
                </g>
              </g>
            );
          }

          // ─── 8. LONG / SHORT POSITION OVERLAY ───
          if (drawing.type === 'long' || drawing.type === 'short') {
            const entryY = priceToY(drawing.entryPrice);
            const tpY = priceToY(drawing.tpPrice);
            const slY = priceToY(drawing.slPrice);

            if (entryY == null || tpY == null || slY == null) return null;

            const isLong = drawing.type === 'long';

            let x = drawing.x || 50;
            let width = drawing.width || 260;

            if (drawing.startLogical != null) {
              const computedX = logicalToX(drawing.startLogical);
              if (computedX != null) {
                x = computedX;
              }
              const bars = drawing.barsCount || 15;
              const computedX2 = logicalToX(drawing.startLogical + bars);
              if (computedX != null && computedX2 != null && computedX2 > computedX) {
                width = Math.max(60, computedX2 - computedX);
              }
            }

            const entry = drawing.entryPrice;
            const tp = drawing.tpPrice;
            const sl = drawing.slPrice;

            const tpDiff = Math.abs(tp - entry);
            const slDiff = Math.abs(entry - sl);

            const tpPercent = Math.abs(((tp - entry) / entry) * 100);
            const slPercent = Math.abs(((entry - sl) / entry) * 100);
            const rrr = slDiff > 0 ? (tpDiff / slDiff).toFixed(2) : '1.00';

            const topBoxY = isLong ? Math.min(entryY, tpY) : Math.min(entryY, slY);
            const topBoxHeight = isLong ? Math.abs(entryY - tpY) : Math.abs(entryY - slY);

            const bottomBoxY = isLong ? Math.min(entryY, slY) : Math.min(entryY, tpY);
            const bottomBoxHeight = isLong ? Math.abs(entryY - slY) : Math.abs(entryY - tpY);

            const greenY = isLong ? topBoxY : bottomBoxY;
            const greenHeight = isLong ? topBoxHeight : bottomBoxHeight;

            const redY = isLong ? bottomBoxY : topBoxY;
            const redHeight = isLong ? bottomBoxHeight : topBoxHeight;

            return (
              <g key={drawing.id} className="position-group">
                {/* Green Zone (Target Box) */}
                <rect
                  x={x}
                  y={greenY}
                  width={width}
                  height={Math.max(2, greenHeight)}
                  fill="rgba(16, 185, 129, 0.22)"
                  stroke="rgba(16, 185, 129, 0.8)"
                  strokeWidth="1"
                />

                {/* Red Zone (Stop Box) */}
                <rect
                  x={x}
                  y={redY}
                  width={width}
                  height={Math.max(2, redHeight)}
                  fill="rgba(244, 63, 94, 0.22)"
                  stroke="rgba(244, 63, 94, 0.8)"
                  strokeWidth="1"
                />

                {/* Entry Center Line */}
                <line
                  x1={x}
                  y1={entryY}
                  x2={x + width}
                  y2={entryY}
                  stroke="rgba(255, 255, 255, 0.7)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />

                {/* Top Pill Label */}
                <foreignObject
                  x={x + 10}
                  y={topBoxY - 32}
                  width={width - 20}
                  height={28}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className={`tv-pill ${isLong ? 'tv-pill-green' : 'tv-pill-red'}`} style={{ pointerEvents: 'none' }}>
                    <span>
                      {isLong ? 'Target' : 'Stop'}: {tpDiff.toLocaleString('id-ID')} ({tpPercent.toFixed(3)}%) {tpDiff.toLocaleString('id-ID')}, Amount: 1250
                    </span>
                  </div>
                </foreignObject>

                {/* Bottom Pill Label */}
                <foreignObject
                  x={x + 10}
                  y={bottomBoxY + bottomBoxHeight + 6}
                  width={width - 20}
                  height={28}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className={`tv-pill ${isLong ? 'tv-pill-red' : 'tv-pill-green'}`} style={{ pointerEvents: 'none' }}>
                    <span>
                      {isLong ? 'Stop' : 'Target'}: {slDiff.toLocaleString('id-ID')} ({slPercent.toFixed(3)}%) {slDiff.toLocaleString('id-ID')}, Amount: 750
                    </span>
                  </div>
                </foreignObject>

                {/* Center Badge */}
                <foreignObject
                  x={x + (width - 190) / 2}
                  y={entryY - 14}
                  width={190}
                  height={28}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="tv-center-badge" style={{ pointerEvents: 'none' }}>
                    <span>Risk/reward ratio: {rrr}</span>
                  </div>
                </foreignObject>

                {/* Blue Square Drag Handles */}
                <g style={{ cursor: 'ns-resize', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, isLong ? 'tp' : 'sl')}>
                  <rect x={x - hitboxSize / 2} y={topBoxY - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x - hs / 2} y={topBoxY - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                <g style={{ cursor: 'ns-resize', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, isLong ? 'tp' : 'sl')}>
                  <rect x={x + width - hitboxSize / 2} y={topBoxY - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x + width - hs / 2} y={topBoxY - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                <g style={{ cursor: 'ns-resize', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, 'entry')}>
                  <rect x={x - hitboxSize / 2} y={entryY - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x - hs / 2} y={entryY - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                <g style={{ cursor: 'ew-resize', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, 'width')}>
                  <rect x={x + width - hitboxSize / 2} y={entryY - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x + width - hs / 2} y={entryY - hs / 2} width={hs} height={hs} className="tv-handle-square handle-width" />
                </g>

                <g style={{ cursor: 'ns-resize', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, isLong ? 'sl' : 'tp')}>
                  <rect x={x - hitboxSize / 2} y={bottomBoxY + bottomBoxHeight - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x - hs / 2} y={bottomBoxY + bottomBoxHeight - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                <g style={{ cursor: 'ns-resize', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, isLong ? 'sl' : 'tp')}>
                  <rect x={x + width - hitboxSize / 2} y={bottomBoxY + bottomBoxHeight - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x + width - hs / 2} y={bottomBoxY + bottomBoxHeight - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                {/* Delete Button */}
                <g
                  className="delete-icon"
                  transform={`translate(${x + width + 10}, ${entryY - 10})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDrawing(drawing.id);
                  }}
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                >
                  <circle cx="10" cy="10" r="10" fill="#1e1e2d" stroke="rgba(255,255,255,0.4)" />
                  <text x="6.5" y="13.5" fill="#f43f5e" fontSize="11" fontWeight="bold">✕</text>
                </g>
              </g>
            );
          }

          if (drawing.type === 'ruler') {
            const y1 = priceToY(drawing.price1);
            const y2 = priceToY(drawing.price2);
            if (y1 == null || y2 == null) return null;

            let x1 = drawing.x1 || 100;
            let x2 = drawing.x2 || 250;

            if (drawing.startLogical != null) {
              const compX1 = logicalToX(drawing.startLogical);
              if (compX1 != null) x1 = compX1;
            }
            if (drawing.endLogical != null) {
              const compX2 = logicalToX(drawing.endLogical);
              if (compX2 != null) x2 = compX2;
            }

            const priceDiff = drawing.price2 - drawing.price1;
            const pctChange = ((priceDiff / drawing.price1) * 100).toFixed(2);
            const isPositive = priceDiff >= 0;

            const top = Math.min(y1, y2);
            const height = Math.abs(y1 - y2);
            const left = Math.min(x1, x2);
            const width = Math.max(40, Math.abs(x1 - x2));

            return (
              <g key={drawing.id} className="ruler-group">
                <rect
                  x={left}
                  y={top}
                  width={width}
                  height={Math.max(4, height)}
                  fill={isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)'}
                  stroke={isPositive ? '#10b981' : '#f43f5e'}
                  strokeDasharray="4 2"
                />
                <foreignObject x={left + 5} y={top + Math.max(5, height / 2 - 15)} width={Math.max(140, width)} height={40} style={{ pointerEvents: 'none' }}>
                  <div className={`ruler-badge ${isPositive ? 'positive' : 'negative'}`} style={{ pointerEvents: 'none' }}>
                    <span>{isPositive ? '+' : ''}{priceDiff} ({isPositive ? '+' : ''}{pctChange}%)</span>
                  </div>
                </foreignObject>
              </g>
            );
          }

          return null;
        })}

        {/* Live Draft Line while drawing 2-click lines / fibs */}
        {lineDraft && (() => {
          const y1 = priceToY(lineDraft.price1);
          const y2 = priceToY(lineDraft.price2);
          const x1 = logicalToX(lineDraft.startLogical);
          const x2 = logicalToX(lineDraft.endLogical);

          if (y1 == null || y2 == null || x1 == null || x2 == null) return null;

          return (
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2962ff" strokeWidth="2" strokeDasharray="4 4" />
          );
        })()}

        {/* Live Draft Ruler */}
        {rulerDraft && (
          <g className="ruler-draft">
            <rect
              x={Math.min(rulerDraft.x1, rulerDraft.x2)}
              y={Math.min(rulerDraft.y1, rulerDraft.y2)}
              width={Math.max(10, Math.abs(rulerDraft.x1 - rulerDraft.x2))}
              height={Math.max(10, Math.abs(rulerDraft.y1 - rulerDraft.y2))}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="#3b82f6"
              strokeDasharray="4 2"
            />
          </g>
        )}
      </svg>

      {/* Render Fib Settings Modal when ⚙️ icon is clicked */}
      {editingFibDrawing && (
        <FibSettingsModal
          drawing={editingFibDrawing}
          onSave={(newSettings) => {
            onUpdateDrawing(editingFibDrawing.id, { fibSettings: newSettings });
          }}
          onClose={() => setEditingFibDrawing(null)}
        />
      )}
    </div>
  );
}
