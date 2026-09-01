import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 1:1 TradingView Position Overlay Component (Long Position & Short Position).
 * Anchors drawings to chart logical indices & price levels with 60 FPS real-time rendering.
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
    const defaultBarsCount = 15; // default 15 candles wide

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

  // Global window drag handler for smooth TP, SL, Entry, and Width handle dragging
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
      }
    };

    const handleWindowMouseUp = () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className={`drawing-overlay ${activeTool !== 'cursor' ? 'interactive-tool-mode' : ''}`}
      onClick={handleContainerClick}
    >
      <svg className="overlay-svg">
        {drawings.map((drawing) => {
          if (drawing.type === 'long' || drawing.type === 'short') {
            const entryY = priceToY(drawing.entryPrice);
            const tpY = priceToY(drawing.tpPrice);
            const slY = priceToY(drawing.slPrice);

            if (entryY == null || tpY == null || slY == null) return null;

            const isLong = drawing.type === 'long';

            // Calculate exact pixel X & width anchored to chart timeline
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

            // Handle Square Size & Hitbox
            const hs = 8;
            const hitboxSize = 20;

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

                {/* Top Pill Label (Positioned safely above top handles) */}
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

                {/* Bottom Pill Label (Positioned safely below bottom handles) */}
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

                {/* Center Badge (Risk/Reward Ratio) */}
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

                {/* ─── Blue Square Drag Handles (■) ─── */}

                {/* 1. TOP HANDLES (TP for Long, SL for Short) */}
                <g style={{ cursor: 'ns-resize', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, isLong ? 'tp' : 'sl')}>
                  <rect x={x - hitboxSize / 2} y={topBoxY - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x - hs / 2} y={topBoxY - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                <g style={{ cursor: 'ns-resize', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, isLong ? 'tp' : 'sl')}>
                  <rect x={x + width - hitboxSize / 2} y={topBoxY - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x + width - hs / 2} y={topBoxY - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                {/* 2. ENTRY HANDLES (Middle Line) */}
                <g style={{ cursor: 'ns-resize', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, 'entry')}>
                  <rect x={x - hitboxSize / 2} y={entryY - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x - hs / 2} y={entryY - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                {/* Entry Right Handle = WIDTH / EXPAND handle */}
                <g style={{ cursor: 'ew-resize', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, 'width')}>
                  <rect x={x + width - hitboxSize / 2} y={entryY - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x + width - hs / 2} y={entryY - hs / 2} width={hs} height={hs} className="tv-handle-square handle-width" />
                </g>

                {/* 3. BOTTOM HANDLES (SL for Long, TP for Short) */}
                <g style={{ cursor: 'ns-resize', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, isLong ? 'sl' : 'tp')}>
                  <rect x={x - hitboxSize / 2} y={bottomBoxY + bottomBoxHeight - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x - hs / 2} y={bottomBoxY + bottomBoxHeight - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                <g style={{ cursor: 'ns-resize', pointerEvents: 'auto' }} onMouseDown={(e) => startDragging(e, drawing, isLong ? 'sl' : 'tp')}>
                  <rect x={x + width - hitboxSize / 2} y={bottomBoxY + bottomBoxHeight - hitboxSize / 2} width={hitboxSize} height={hitboxSize} fill="transparent" />
                  <rect x={x + width - hs / 2} y={bottomBoxY + bottomBoxHeight - hs / 2} width={hs} height={hs} className="tv-handle-square" />
                </g>

                {/* Delete Button (✕) */}
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

        {/* Live Draft Ruler while measuring */}
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
    </div>
  );
}
