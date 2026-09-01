import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 1:1 TradingView Position Overlay Component (Long Position & Short Position).
 * Matches TradingView visual design: green/red zones, top/bottom pill badges, center RRR badge, and blue square drag handles.
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
  const [draggingInfo, setDraggingInfo] = useState(null);
  const [rulerDraft, setRulerDraft] = useState(null);

  // Force re-render overlay when chart scrolls or scales
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    const handleChartUpdate = () => {
      setRenderTrigger(prev => prev + 1);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleChartUpdate);
    chart.timeScale().subscribeVisibleTimeRangeChange(handleChartUpdate);

    return () => {
      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleChartUpdate);
        chart.timeScale().unsubscribeVisibleTimeRangeChange(handleChartUpdate);
      } catch (e) {
        // Chart unmounted
      }
    };
  }, [chartRef]);

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

  // Handle overlay click to add new drawing
  const handleContainerClick = (e) => {
    if (draggingInfo) return;
    if (activeTool === 'cursor') return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clickedPrice = yToPrice(clickY);
    if (clickedPrice == null) return;

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
          x2: clickX,
          price2: clickedPrice,
        });
        setRulerDraft(null);
        if (onToolUsed) onToolUsed();
      }
    }
  };

  // Mouse move handler for dragging handles or ruler draft
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (rulerDraft) {
      setRulerDraft(prev => ({
        ...prev,
        x2: mouseX,
        y2: mouseY,
        price2: yToPrice(mouseY) || prev.price2,
      }));
      return;
    }

    if (!draggingInfo) return;

    const { drawingId, handleType, initialDrawing } = draggingInfo;
    const currentPrice = yToPrice(mouseY);
    if (currentPrice == null) return;

    const targetDrawing = drawings.find(d => d.id === drawingId);
    if (!targetDrawing) return;

    if (handleType === 'tp') {
      onUpdateDrawing(drawingId, { tpPrice: currentPrice });
    } else if (handleType === 'sl') {
      onUpdateDrawing(drawingId, { slPrice: currentPrice });
    } else if (handleType === 'entry') {
      const priceDiff = currentPrice - initialDrawing.entryPrice;
      onUpdateDrawing(drawingId, {
        entryPrice: currentPrice,
        tpPrice: initialDrawing.tpPrice + priceDiff,
        slPrice: initialDrawing.slPrice + priceDiff,
      });
    } else if (handleType === 'width') {
      const newWidth = Math.max(100, mouseX - targetDrawing.x);
      onUpdateDrawing(drawingId, { width: newWidth });
    }
  };

  const handleMouseUp = () => {
    if (draggingInfo) {
      setDraggingInfo(null);
    }
  };

  const startDragging = (e, drawing, handleType) => {
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    setDraggingInfo({
      drawingId: drawing.id,
      handleType,
      startY: e.clientY - rect.top,
      startX: e.clientX - rect.left,
      initialDrawing: { ...drawing },
    });
  };

  return (
    <div
      ref={containerRef}
      className={`drawing-overlay ${activeTool !== 'cursor' ? 'interactive-tool-mode' : ''}`}
      onClick={handleContainerClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <svg className="overlay-svg">
        {drawings.map((drawing) => {
          if (drawing.type === 'long' || drawing.type === 'short') {
            const entryY = priceToY(drawing.entryPrice);
            const tpY = priceToY(drawing.tpPrice);
            const slY = priceToY(drawing.slPrice);

            if (entryY == null || tpY == null || slY == null) return null;

            const isLong = drawing.type === 'long';
            const x = drawing.x || 50;
            const width = drawing.width || 260;

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

            // Handle Square Size (TradingView ■ blue handle)
            const hs = 7;

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

                {/* Top Pill Label (Target for Long, Stop for Short) */}
                <foreignObject x={x + 10} y={topBoxY - 26} width={width - 20} height={28}>
                  <div className={`tv-pill ${isLong ? 'tv-pill-green' : 'tv-pill-red'}`}>
                    <span>
                      {isLong ? 'Target' : 'Stop'}: {tpDiff.toLocaleString('id-ID')} ({tpPercent.toFixed(3)}%) {tpDiff.toLocaleString('id-ID')}, Amount: 1250
                    </span>
                  </div>
                </foreignObject>

                {/* Bottom Pill Label (Stop for Long, Target for Short) */}
                <foreignObject x={x + 10} y={bottomBoxY + bottomBoxHeight - 2} width={width - 20} height={28}>
                  <div className={`tv-pill ${isLong ? 'tv-pill-red' : 'tv-pill-green'}`}>
                    <span>
                      {isLong ? 'Stop' : 'Target'}: {slDiff.toLocaleString('id-ID')} ({slPercent.toFixed(3)}%) {slDiff.toLocaleString('id-ID')}, Amount: 750
                    </span>
                  </div>
                </foreignObject>

                {/* Center Badge (Risk/Reward Ratio) */}
                <foreignObject x={x + (width - 190) / 2} y={entryY - 14} width={190} height={28}>
                  <div className="tv-center-badge">
                    <span>Risk/reward ratio: {rrr}</span>
                  </div>
                </foreignObject>

                {/* TradingView Blue Square Drag Handles (■) */}
                {/* Top Handle */}
                <rect
                  x={x - hs / 2}
                  y={topBoxY - hs / 2}
                  width={hs}
                  height={hs}
                  className="tv-handle-square"
                  onMouseDown={(e) => startDragging(e, drawing, isLong ? 'tp' : 'sl')}
                />
                <rect
                  x={x + width - hs / 2}
                  y={topBoxY - hs / 2}
                  width={hs}
                  height={hs}
                  className="tv-handle-square"
                  onMouseDown={(e) => startDragging(e, drawing, isLong ? 'tp' : 'sl')}
                />

                {/* Entry Handles */}
                <rect
                  x={x - hs / 2}
                  y={entryY - hs / 2}
                  width={hs}
                  height={hs}
                  className="tv-handle-square"
                  onMouseDown={(e) => startDragging(e, drawing, 'entry')}
                />
                <rect
                  x={x + width - hs / 2}
                  y={entryY - hs / 2}
                  width={hs}
                  height={hs}
                  className="tv-handle-square handle-width"
                  onMouseDown={(e) => startDragging(e, drawing, 'width')}
                />

                {/* Bottom Handle */}
                <rect
                  x={x - hs / 2}
                  y={bottomBoxY + bottomBoxHeight - hs / 2}
                  width={hs}
                  height={hs}
                  className="tv-handle-square"
                  onMouseDown={(e) => startDragging(e, drawing, isLong ? 'sl' : 'tp')}
                />
                <rect
                  x={x + width - hs / 2}
                  y={bottomBoxY + bottomBoxHeight - hs / 2}
                  width={hs}
                  height={hs}
                  className="tv-handle-square"
                  onMouseDown={(e) => startDragging(e, drawing, isLong ? 'sl' : 'tp')}
                />

                {/* Delete Button (✕) */}
                <g
                  className="delete-icon"
                  transform={`translate(${x + width + 8}, ${entryY - 8})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDrawing(drawing.id);
                  }}
                >
                  <circle cx="8" cy="8" r="9" fill="#1e1e2d" stroke="rgba(255,255,255,0.3)" />
                  <text x="5" y="11" fill="#f43f5e" fontSize="10" fontWeight="bold">✕</text>
                </g>
              </g>
            );
          }

          if (drawing.type === 'ruler') {
            const y1 = priceToY(drawing.price1);
            const y2 = priceToY(drawing.price2);
            if (y1 == null || y2 == null) return null;

            const x1 = drawing.x1 || 100;
            const x2 = drawing.x2 || 250;

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
                <foreignObject x={left + 5} y={top + Math.max(5, height / 2 - 15)} width={Math.max(140, width)} height={40}>
                  <div className={`ruler-badge ${isPositive ? 'positive' : 'negative'}`}>
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
