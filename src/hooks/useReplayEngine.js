import { useState, useEffect, useCallback, useRef } from 'react';
import { BASE_INTERVAL_MS } from '../config/stocks';

/**
 * TradingView-style Replay Engine Hook.
 *
 * Modes:
 * - 'normal': Full chart view. User can analyze full history.
 * - 'picking': Bar replay mode active. User can click any candle on the chart to set cutoff point.
 * - 'replaying': Replay active from selected cutoff point. Future candles hidden.
 *
 * @param {Array} fullData - Complete historical candle dataset
 * @returns {Object} Replay state and actions
 */
export function useReplayEngine(fullData) {
  const [mode, setMode] = useState('normal'); // 'normal' | 'picking' | 'replaying'
  const [cutoffIndex, setCutoffIndex] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isFinished, setIsFinished] = useState(false);
  const [showFinishedModal, setShowFinishedModal] = useState(false);
  const intervalRef = useRef(null);

  const totalCandles = fullData ? fullData.length : 0;

  // Reset when fullData changes (e.g. stock changed)
  useEffect(() => {
    setMode('normal');
    setCutoffIndex(null);
    setCurrentIndex(null);
    setIsPlaying(false);
    setIsFinished(false);
    setShowFinishedModal(false);
  }, [fullData]);

  // Compute visible candles based on mode
  let visibleCandles = fullData || [];
  if (mode === 'replaying' && currentIndex !== null) {
    visibleCandles = fullData.slice(0, currentIndex + 1);
  }

  // Current candle info
  const currentCandle = (mode === 'replaying' && currentIndex !== null)
    ? fullData[currentIndex]
    : null;

  // Cutoff candle info
  const cutoffCandle = (cutoffIndex !== null && fullData)
    ? fullData[cutoffIndex]
    : null;

  // Auto-advance effect during replay
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mode === 'replaying' && isPlaying && !isFinished && fullData) {
      const intervalMs = BASE_INTERVAL_MS / speed;

      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          const nextIdx = prev + 1;
          if (nextIdx >= totalCandles) {
            setIsPlaying(false);
            setIsFinished(true);
            setShowFinishedModal(true);
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            return prev;
          }
          return nextIdx;
        });
      }, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [mode, isPlaying, speed, isFinished, totalCandles, fullData]);

  // Start picking replay bar
  const startPicking = useCallback(() => {
    setIsPlaying(false);
    setMode('picking');
  }, []);

  // Cancel picking / exit replay back to normal full chart
  const exitReplay = useCallback(() => {
    setIsPlaying(false);
    setMode('normal');
    setCutoffIndex(null);
    setCurrentIndex(null);
    setIsFinished(false);
    setShowFinishedModal(false);
  }, []);

  // Select replay cutoff point (via clicking candle or date)
  const selectCutoffByTime = useCallback((timeVal) => {
    if (!fullData) return;
    const idx = fullData.findIndex(c => c.time === timeVal || String(c.time) === String(timeVal));
    if (idx !== -1) {
      setCutoffIndex(idx);
      setCurrentIndex(idx);
      setMode('replaying');
      setIsPlaying(false);
      setIsFinished(false);
      setShowFinishedModal(false);
    }
  }, [fullData]);

  // Select cutoff by index
  const selectCutoffByIndex = useCallback((index) => {
    if (!fullData || index < 0 || index >= fullData.length) return;
    setCutoffIndex(index);
    setCurrentIndex(index);
    setMode('replaying');
    setIsPlaying(false);
    setIsFinished(false);
    setShowFinishedModal(false);
  }, [fullData]);

  // Next candle
  const next = useCallback(() => {
    if (mode !== 'replaying' || !fullData) return;

    setCurrentIndex(prev => {
      const nextIdx = prev + 1;
      if (nextIdx >= totalCandles) {
        setIsPlaying(false);
        setIsFinished(true);
        setShowFinishedModal(true);
        return prev;
      }
      return nextIdx;
    });
  }, [mode, totalCandles, fullData]);

  // Previous candle
  const previous = useCallback(() => {
    if (mode !== 'replaying' || !fullData) return;

    setIsFinished(false);
    setShowFinishedModal(false);
    setCurrentIndex(prev => Math.max(cutoffIndex, prev - 1));
  }, [mode, cutoffIndex, fullData]);

  // Play
  const play = useCallback(() => {
    if (mode !== 'replaying' || !fullData || isFinished) return;
    setIsPlaying(true);
  }, [mode, fullData, isFinished]);

  // Pause
  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  // Reset replay to cutoff candle
  const resetToCutoff = useCallback(() => {
    setIsPlaying(false);
    setIsFinished(false);
    setShowFinishedModal(false);
    if (cutoffIndex !== null) {
      setCurrentIndex(cutoffIndex);
    }
  }, [cutoffIndex]);

  // Change speed
  const changeSpeed = useCallback((newSpeed) => {
    setSpeed(newSpeed);
  }, []);

  // Dismiss finished modal (stay on chart)
  const dismissFinishedModal = useCallback(() => {
    setShowFinishedModal(false);
  }, []);

  return {
    // State
    mode, // 'normal' | 'picking' | 'replaying'
    cutoffIndex,
    currentIndex,
    isPlaying,
    speed,
    isFinished,
    showFinishedModal,
    visibleCandles,
    currentCandle,
    cutoffCandle,
    totalCandles,
    replayedCount: (currentIndex !== null && cutoffIndex !== null) ? (currentIndex - cutoffIndex + 1) : 0,
    remainingCount: (currentIndex !== null) ? (totalCandles - currentIndex - 1) : 0,

    // Actions
    startPicking,
    exitReplay,
    selectCutoffByTime,
    selectCutoffByIndex,
    next,
    previous,
    play,
    pause,
    togglePlay,
    resetToCutoff,
    changeSpeed,
    dismissFinishedModal,
  };
}
