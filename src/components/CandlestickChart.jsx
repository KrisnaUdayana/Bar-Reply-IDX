import { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";
import DrawingOverlay from "./DrawingOverlay";
import { tickMarkFormatter, chartLocalization } from "../utils/chartFormatters";

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
  onChartReady,
  showTimeAxis = true,
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
      localization: chartLocalization,
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
        visible: showTimeAxis,
        borderColor: "rgba(255, 255, 255, 0.08)",
        timeVisible: false,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 12,
        minBarSpacing: 4,
        tickMarkFormatter,
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

    if (onChartReady) {
      onChartReady(chart, candleSeries);
    }

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartContainerRef.current) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });

    resizeObserver.observe(chartContainerRef.current);

    // Scrolling over the price scale (right axis) should zoom the price
    // scale vertically (stretch/compress candles), not the time scale
    // horizontally. We intercept the wheel event in the capture phase so we
    // can stop it before the library's own wheel handler (which otherwise
    // always zooms the time scale) sees it.
    const handlePriceScaleWheel = (event) => {
      const container = chartContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const priceScaleWidth = chart.priceScale("right").width();
      const boundaryX = rect.width - priceScaleWidth;
      const cursorX = event.clientX - rect.left;

      if (cursorX < boundaryX) return; // over the chart body, keep default behavior

      event.preventDefault();
      event.stopImmediatePropagation();

      const priceScale = chart.priceScale("right");
      const currentMargins = priceScale.options().scaleMargins || { top: 0.1, bottom: 0.1 };
      const zoomIntensity = 0.0006;
      const delta = event.deltaY * zoomIntensity;

      const clamp = (v) => Math.min(0.45, Math.max(0.02, v));

      priceScale.applyOptions({
        scaleMargins: {
          top: clamp(currentMargins.top + delta),
          bottom: clamp(currentMargins.bottom + delta),
        },
      });
    };

    chartContainerRef.current.addEventListener("wheel", handlePriceScaleWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      resizeObserver.disconnect();
      chartContainerRef.current?.removeEventListener("wheel", handlePriceScaleWheel, {
        capture: true,
      });
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      if (onChartReady) {
        onChartReady(null, null);
      }
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

  // Hide this chart's own date axis whenever an indicator pane is stacked
  // below it, so the date labels only appear once, at the bottom-most pane
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      timeScale: { visible: showTimeAxis },
    });
  }, [showTimeAxis]);

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
