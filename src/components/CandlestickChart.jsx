import { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";
import DrawingOverlay from "./DrawingOverlay";

/**
 * Candlestick chart component using TradingView's lightweight-charts.
 * Supports full chart viewing, interactive candle picking, and Drawing Overlay.
 */
export default function CandlestickChart({
  data,
  ticker,
  isPicking = false,
  onSelectCandleTime,
  timeframe = "1D",
  activeTool = "cursor",
  drawings = [],
  onAddDrawing,
  onUpdateDrawing,
  onRemoveDrawing,
  onToolUsed,
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const isPickingRef = useRef(isPicking);
  const onSelectCandleTimeRef = useRef(onSelectCandleTime);

  // Keep refs updated for event listener callbacks
  useEffect(() => {
    isPickingRef.current = isPicking;
  }, [isPicking]);

  useEffect(() => {
    onSelectCandleTimeRef.current = onSelectCandleTime;
  }, [onSelectCandleTime]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.6)",
        fontFamily: "'Inter', sans-serif",
        fontSize: 12,
      },
      localization: {
        locale: "id-ID",
        timeFormatter: (time) => {
          if (typeof time === "number") {
            const d = new Date(time * 1000);
            return d
              .toLocaleString("id-ID", {
                timeZone: "Asia/Jakarta",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
              .replace(".", ":");
          }
          return String(time);
        },
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: "rgba(16, 185, 129, 0.4)",
          labelBackgroundColor: "rgba(16, 185, 129, 0.9)",
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.15)",
          labelBackgroundColor: "rgba(16, 185, 129, 0.9)",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        timeVisible: false,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 12,
        minBarSpacing: 4,
        tickMarkFormatter: (time, tickMarkType) => {
          if (typeof time === "number") {
            const date = new Date(time * 1000);
            // tickMarkType: 0 = Year, 1 = Month, 2 = DayOfMonth, 3 = Time, 4 = TimeWithSeconds
            if (tickMarkType <= 2) {
              return date.toLocaleDateString("id-ID", {
                timeZone: "Asia/Jakarta",
                day: "numeric",
                month: "short",
              });
            }
            return date
              .toLocaleTimeString("id-ID", {
                timeZone: "Asia/Jakarta",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
              .replace(".", ":");
          }
          return null;
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    // Subscribe to chart click event for picking replay candle
    chart.subscribeClick((param) => {
      if (!isPickingRef.current) return;
      if (param.time == null) return;

      let timeVal;
      if (typeof param.time === "number" || typeof param.time === "string") {
        timeVal = param.time;
      } else if (typeof param.time === "object" && param.time !== null) {
        timeVal = `${param.time.year}-${String(param.time.month).padStart(2, "0")}-${String(param.time.day).padStart(2, "0")}`;
      }

      if (timeVal != null && onSelectCandleTimeRef.current) {
        onSelectCandleTimeRef.current(timeVal);
      }
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartContainerRef.current) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update chart options when timeframe changes
  useEffect(() => {
    if (!chartRef.current) return;
    const isHourly = ["1H", "2H", "3H", "4H"].includes(timeframe);
    chartRef.current.applyOptions({
      timeScale: {
        timeVisible: isHourly,
        secondsVisible: false,
      },
    });
  }, [timeframe]);

  // Update data when visible candles change
  useEffect(() => {
    if (!seriesRef.current || !data || data.length === 0) return;

    seriesRef.current.setData(data);
  }, [data]);

  return (
    <div className={`chart-wrapper ${isPicking ? "is-picking-mode" : ""}`}>
      <div className="chart-header">
        <span className="chart-ticker">{ticker}</span>
        <span className="chart-timeframe">{timeframe}</span>
        {isPicking && <span className="picking-badge">✂️ Klik candle pada chart untuk memotong replay dari titik tersebut</span>}
      </div>
      <div ref={chartContainerRef} className="chart-container">
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          activeTool={activeTool}
          drawings={drawings}
          onAddDrawing={onAddDrawing}
          onUpdateDrawing={onUpdateDrawing}
          onRemoveDrawing={onRemoveDrawing}
          onToolUsed={onToolUsed}
        />
      </div>
    </div>
  );
}
