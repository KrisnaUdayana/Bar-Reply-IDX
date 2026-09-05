import { useEffect, useRef, useMemo } from "react";
import { createChart, ColorType } from "lightweight-charts";
import { calculateMACD } from "../utils/indicatorCalculations";
import { tickMarkFormatter, chartLocalization } from "../utils/chartFormatters";
import "../styles/MACDIndicator.css";

/**
 * MACD panel rendered as its own lightweight-charts instance so its time
 * scale can be synced bidirectionally with the main candlestick chart
 * (scroll/zoom on either pane moves both).
 */
export default function MACDIndicator({ data, mainChartRef, mainSeriesRef, timeframe = "1D" }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const macdSeriesRef = useRef(null);
  const signalSeriesRef = useRef(null);
  const histogramSeriesRef = useRef(null);
  const isSyncingRef = useRef(false);
  const isSyncingCrosshairRef = useRef(false);

  const { macdData, macdValueByTime, closeByTime } = useMemo(() => {
    if (!data || data.length === 0) {
      return { macdData: [], macdValueByTime: new Map(), closeByTime: new Map() };
    }

    const calculated = calculateMACD(data);
    const valueByTime = new Map();
    const closeMap = new Map();

    calculated.forEach((d, i) => {
      if (d.macd !== undefined && !isNaN(d.macd)) {
        valueByTime.set(d.time, d.macd);
      }
      if (data[i]) {
        closeMap.set(d.time, data[i].close);
      }
    });

    return { macdData: calculated, macdValueByTime: valueByTime, closeByTime: closeMap };
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
      localization: chartLocalization,
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

    // Same fix as the main chart: scrolling over the price scale (right
    // axis) should zoom that scale vertically instead of the time scale.
    const handlePriceScaleWheel = (event) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const priceScaleWidth = chart.priceScale("right").width();
      const boundaryX = rect.width - priceScaleWidth;
      const cursorX = event.clientX - rect.left;

      if (cursorX < boundaryX) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const priceScale = chart.priceScale("right");
      const currentMargins = priceScale.options().scaleMargins || { top: 0.2, bottom: 0.2 };
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

    containerRef.current.addEventListener("wheel", handlePriceScaleWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      resizeObserver.disconnect();
      containerRef.current?.removeEventListener("wheel", handlePriceScaleWheel, {
        capture: true,
      });
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

  // Keep this pane's own time axis (it's the one showing dates whenever the
  // MACD panel is active) in sync with the selected timeframe, same as the
  // main chart does.
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

  // Bidirectional sync of the visible range AND the crosshair with the main
  // chart, so the vertical crosshair line reads as one continuous line
  // running through both panes instead of two disconnected ones.
  useEffect(() => {
    const macdChart = chartRef.current;
    const macdLineSeries = macdSeriesRef.current;
    if (!macdChart || !macdLineSeries) return;

    const trySync = () => {
      const mainChart = mainChartRef?.current;
      const mainSeries = mainSeriesRef?.current;
      if (!mainChart || !mainSeries) return null;

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

      const syncCrosshairFromMain = (param) => {
        if (isSyncingCrosshairRef.current) return;
        isSyncingCrosshairRef.current = true;
        if (param.time == null) {
          macdChart.clearCrosshairPosition();
        } else {
          const value = macdValueByTime.get(param.time) ?? 0;
          macdChart.setCrosshairPosition(value, param.time, macdLineSeries);
        }
        isSyncingCrosshairRef.current = false;
      };

      const syncCrosshairFromMacd = (param) => {
        if (isSyncingCrosshairRef.current) return;
        isSyncingCrosshairRef.current = true;
        if (param.time == null) {
          mainChart.clearCrosshairPosition();
        } else {
          const value = closeByTime.get(param.time);
          if (value !== undefined) {
            mainChart.setCrosshairPosition(value, param.time, mainSeries);
          }
        }
        isSyncingCrosshairRef.current = false;
      };

      mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromMain);
      macdChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromMacd);
      mainChart.subscribeCrosshairMove(syncCrosshairFromMain);
      macdChart.subscribeCrosshairMove(syncCrosshairFromMacd);

      // Align immediately to whatever the main chart currently shows
      const initialRange = mainChart.timeScale().getVisibleLogicalRange();
      if (initialRange) {
        macdChart.timeScale().setVisibleLogicalRange(initialRange);
      }

      return () => {
        mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromMain);
        macdChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromMacd);
        mainChart.unsubscribeCrosshairMove(syncCrosshairFromMain);
        macdChart.unsubscribeCrosshairMove(syncCrosshairFromMacd);
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
  }, [mainChartRef, mainSeriesRef, macdData, macdValueByTime, closeByTime]);

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
