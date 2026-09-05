import { useEffect, useRef, useMemo } from "react";
import { createChart, ColorType } from "lightweight-charts";
import { calculateMACD } from "../utils/indicatorCalculations";
import "../styles/MACDIndicator.css";

/**
 * MACD panel rendered as its own lightweight-charts instance so its time
 * scale can be synced bidirectionally with the main candlestick chart
 * (scroll/zoom on either pane moves both).
 */
export default function MACDIndicator({ data, mainChartRef }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const macdSeriesRef = useRef(null);
  const signalSeriesRef = useRef(null);
  const histogramSeriesRef = useRef(null);
  const isSyncingRef = useRef(false);

  const macdData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return calculateMACD(data);
  }, [data]);

  // Initialize the MACD chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.6)",
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      crosshair: { mode: 0 },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        scaleMargins: { top: 0.2, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        visible: true,
        timeVisible: false,
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

    const histogramSeries = chart.addHistogramSeries({
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const macdSeries = chart.addLineSeries({
      color: "#6366f1",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const signalSeries = chart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    macdSeriesRef.current = macdSeries;
    signalSeriesRef.current = signalSeries;
    histogramSeriesRef.current = histogramSeries;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !containerRef.current) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      macdSeriesRef.current = null;
      signalSeriesRef.current = null;
      histogramSeriesRef.current = null;
    };
  }, []);

  // Push calculated MACD values into the series
  useEffect(() => {
    if (!macdSeriesRef.current || macdData.length === 0) return;

    // Keep one entry per candle (using "whitespace" points where the value
    // isn't available yet) so bar count/order stays identical to the main
    // candlestick series — required for the logical-range sync to line up
    // on the correct dates instead of drifting.
    const macdLine = macdData.map((d) =>
      d.macd !== undefined && !isNaN(d.macd) ? { time: d.time, value: d.macd } : { time: d.time }
    );

    const signalLine = macdData.map((d) =>
      d.signal !== undefined && !isNaN(d.signal) ? { time: d.time, value: d.signal } : { time: d.time }
    );

    const histogram = macdData.map((d) =>
      d.histogram !== undefined && !isNaN(d.histogram)
        ? {
            time: d.time,
            value: d.histogram,
            color: d.histogram >= 0 ? "rgba(16, 185, 129, 0.5)" : "rgba(244, 63, 94, 0.5)",
          }
        : { time: d.time }
    );

    macdSeriesRef.current.setData(macdLine);
    signalSeriesRef.current.setData(signalLine);
    histogramSeriesRef.current.setData(histogram);
  }, [macdData]);

  // Bidirectional sync of the visible range with the main chart
  useEffect(() => {
    const macdChart = chartRef.current;
    if (!macdChart) return;

    const trySync = () => {
      const mainChart = mainChartRef?.current;
      if (!mainChart) return null;

      const syncFromMain = (range) => {
        if (isSyncingRef.current || !range) return;
        isSyncingRef.current = true;
        macdChart.timeScale().setVisibleLogicalRange(range);
        isSyncingRef.current = false;
      };

      const syncFromMacd = (range) => {
        if (isSyncingRef.current || !range) return;
        isSyncingRef.current = true;
        mainChart.timeScale().setVisibleLogicalRange(range);
        isSyncingRef.current = false;
      };

      mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromMain);
      macdChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromMacd);

      // Align immediately to whatever the main chart currently shows
      const initialRange = mainChart.timeScale().getVisibleLogicalRange();
      if (initialRange) {
        macdChart.timeScale().setVisibleLogicalRange(initialRange);
      }

      return () => {
        mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromMain);
        macdChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromMacd);
      };
    };

    // Main chart instance may not be ready yet on the very first render;
    // retry briefly until it is.
    let cleanup = trySync();
    let retryTimer = null;
    if (!cleanup) {
      retryTimer = setInterval(() => {
        cleanup = trySync();
        if (cleanup) {
          clearInterval(retryTimer);
        }
      }, 100);
    }

    return () => {
      if (retryTimer) clearInterval(retryTimer);
      if (cleanup) cleanup();
    };
  }, [mainChartRef, macdData]);

  return (
    <div className="macd-container">
      <div className="macd-header">
        <h3 className="macd-title">MACD</h3>
        <div className="macd-legend">
          <div className="macd-legend-item">
            <div className="macd-legend-color macd-line" />
            <span>MACD</span>
          </div>
          <div className="macd-legend-item">
            <div className="macd-legend-color signal-line" />
            <span>Signal</span>
          </div>
          <div className="macd-legend-item">
            <div className="macd-legend-color histogram-bar" />
            <span>Histogram</span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="macd-chart-container" />
    </div>
  );
}
