import { useState } from "react";
import "../styles/IndicatorsModal.css";

const INDICATORS_BY_CATEGORY = {
  Popular: [
    "Moving Average",
    "Bollinger Bands",
    "RSI",
    "MACD",
    "Stochastic",
    "ATR",
  ],
  Bandarmotology: [
    "Bandarmotology RSI",
    "Band Strength",
    "Volume Profile",
  ],
  Technical: [
    "Accumulation/Distribution",
    "Average Price",
    "Bollinger Bands",
    "Chaikin Volatility",
    "Foreign Flow Underlay",
    "Frequency Analyzer",
    "Linear Regression Slope",
    "MACD",
    "Momentum Oscillator",
    "Moving Average Double",
    "Moving Average Multiple",
    "Net Foreign Buy / Sell",
    "Rank Correlation Index",
    "Foreign Flow",
    "Frequency",
    "Ichimoku Cloud",
    "MA with EMA Cross",
    "Median Price",
    "Moving Average Adaptive",
    "Moving Average Hamming",
    "Moving Average Weighted",
    "Parabolic SAR",
    "Pivot Points Standard",
    "Ratio",
    "RSI",
  ],
  Fundamental: [
    "P/E Ratio",
    "Dividend Yield",
    "Book Value",
    "ROE",
    "Debt to Equity",
    "Price to Book",
  ],
  All: [
    "Accumulation/Distribution",
    "Average Price",
    "Bollinger Bands",
    "Chaikin Volatility",
    "Foreign Flow Underlay",
    "Frequency Analyzer",
    "Linear Regression Slope",
    "MACD",
    "Momentum Oscillator",
    "Moving Average Double",
    "Moving Average Multiple",
    "Net Foreign Buy / Sell",
    "Rank Correlation Index",
    "Foreign Flow",
    "Frequency",
    "Ichimoku Cloud",
    "MA with EMA Cross",
    "Median Price",
    "Moving Average Adaptive",
    "Moving Average Hamming",
    "Moving Average Weighted",
    "Parabolic SAR",
    "Pivot Points Standard",
    "Ratio",
    "RSI",
    "P/E Ratio",
    "Dividend Yield",
    "Book Value",
    "ROE",
  ],
};

export default function IndicatorsModal({ isOpen, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState("Popular");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const currentIndicators = INDICATORS_BY_CATEGORY[selectedCategory];
  const filteredIndicators = currentIndicators.filter((indicator) =>
    indicator.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="indicators-modal-backdrop" onClick={onClose}>
      <div className="indicators-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header with Close Button */}
        <div className="indicators-modal-header">
          <h2 className="indicators-modal-title">Indicators</h2>
          <button
            className="indicators-close-btn"
            onClick={onClose}
            aria-label="Close indicators"
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="indicators-search-container">
          <input
            type="text"
            className="indicators-search-input"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg
            className="indicators-search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        {/* Category Tabs */}
        <div className="indicators-tabs">
          {Object.keys(INDICATORS_BY_CATEGORY).map((category) => (
            <button
              key={category}
              className={`indicators-tab ${
                selectedCategory === category ? "active" : ""
              }`}
              onClick={() => {
                setSelectedCategory(category);
                setSearchQuery("");
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Indicators Grid */}
        <div className="indicators-grid">
          {filteredIndicators.length > 0 ? (
            filteredIndicators.map((indicator, index) => (
              <button
                key={index}
                className="indicators-item"
                title={`Add ${indicator} indicator`}
              >
                {indicator}
              </button>
            ))
          ) : (
            <div className="indicators-empty">
              <p>No indicators found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
