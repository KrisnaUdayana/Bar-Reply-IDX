// Shared date/time formatting for lightweight-charts instances so the main
// candlestick chart and any indicator pane below it render identical,
// TradingView-style axis labels no matter which one currently owns the
// bottom time axis.
//
// Daily/weekly/monthly candles carry their time as a plain "YYYY-MM-DD"
// business-day string (see utils/dataLoader.js), not a Unix timestamp — so
// every formatter here has to handle both shapes, or the string case falls
// straight through to lightweight-charts' own (unformatted) default.

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function toParts(time) {
  if (typeof time === "string") {
    const [year, month, day] = time.split("-").map(Number);
    return { year, month, day };
  }
  if (typeof time === "object" && time !== null) {
    return time; // already a BusinessDay { year, month, day }
  }
  return null;
}

// tickMarkType: 0 = Year, 1 = Month, 2 = DayOfMonth, 3 = Time, 4 = TimeWithSeconds
export function tickMarkFormatter(time, tickMarkType) {
  const parts = toParts(time);

  if (parts) {
    if (tickMarkType === 0) return String(parts.year);
    // Month and day ticks both show "day + month" so every label reads as
    // a full date on its own, instead of a bare day number with no context.
    return `${parts.day} ${MONTHS_ID[parts.month - 1]}`;
  }

  if (typeof time === "number") {
    const date = new Date(time * 1000);

    if (tickMarkType === 0) {
      return date.toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
      });
    }

    if (tickMarkType === 1 || tickMarkType === 2) {
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
}

export const chartLocalization = {
  locale: "id-ID",
  timeFormatter: (time) => {
    const parts = toParts(time);
    if (parts) {
      const yy = String(parts.year).slice(-2);
      return `${parts.day} ${MONTHS_ID[parts.month - 1]} '${yy}`;
    }

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
};
