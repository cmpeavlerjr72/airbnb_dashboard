import { useState, useMemo } from 'react';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function parseLocal(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function nightsInMonth(startDate, endDate, year, month) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const start = parseLocal(startDate);
  const end = parseLocal(endDate);
  const overlapStart = start > monthStart ? start : monthStart;
  const overlapEnd = end <= monthEnd ? end : new Date(year, month + 1, 0, 23, 59, 59);
  if (overlapStart >= overlapEnd) return 0;
  return Math.round((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
}

export default function RevenueProjector({ bookings }) {
  const [occupancy, setOccupancy] = useState(75);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const months = useMemo(() => {
    const monthSet = new Map();
    bookings.forEach(b => {
      const start = parseLocal(b.startDate);
      const end = parseLocal(b.endDate);
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      const last = new Date(end.getFullYear(), end.getMonth(), 1);
      while (current <= last) {
        const key = `${current.getFullYear()}-${current.getMonth()}`;
        if (!monthSet.has(key)) {
          monthSet.set(key, { year: current.getFullYear(), month: current.getMonth() });
        }
        current.setMonth(current.getMonth() + 1);
      }
    });
    return [...monthSet.values()].sort((a, b) => a.year - b.year || a.month - b.month);
  }, [bookings]);

  const activeMonth = selectedMonth || months[0] || null;

  const projection = useMemo(() => {
    if (!activeMonth) return null;
    const { year, month } = activeMonth;
    let totalEarnings = 0;
    let totalNights = 0;

    bookings.forEach(b => {
      const nights = nightsInMonth(b.startDate, b.endDate, year, month);
      if (nights > 0) {
        totalEarnings += b.grossEarnings * (nights / Math.round((parseLocal(b.endDate) - parseLocal(b.startDate)) / (1000 * 60 * 60 * 24)));
        totalNights += nights;
      }
    });

    const daysInMonth = getDaysInMonth(year, month);
    const avgNightlyRate = totalNights > 0 ? totalEarnings / totalNights : 0;
    const projectedNights = Math.round(daysInMonth * (occupancy / 100));
    const projectedRevenue = avgNightlyRate * projectedNights;

    return { avgNightlyRate, actualNights: totalNights, daysInMonth, projectedNights, projectedRevenue };
  }, [bookings, activeMonth, occupancy]);

  if (months.length === 0) return null;

  const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="chart-card projector-card">
      <h2>Revenue Projector</h2>
      <div className="projector-months">
        {months.map(m => {
          const key = `${m.year}-${m.month}`;
          const isActive = activeMonth && activeMonth.year === m.year && activeMonth.month === m.month;
          return (
            <button
              key={key}
              className={`projector-month-btn ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedMonth(m)}
            >
              {MONTH_NAMES[m.month]} {m.year}
            </button>
          );
        })}
      </div>
      <div className="projector-slider">
        <label>
          Occupancy: <strong>{occupancy}%</strong>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={occupancy}
          onChange={e => setOccupancy(Number(e.target.value))}
        />
      </div>
      {projection && (
        <div className="projector-results">
          <div className="projector-result">
            <span className="projector-result-label">Avg Nightly Rate</span>
            <span className="projector-result-value">{fmt(projection.avgNightlyRate)}</span>
          </div>
          <div className="projector-result">
            <span className="projector-result-label">Actual Booked Nights</span>
            <span className="projector-result-value">{projection.actualNights} / {projection.daysInMonth}</span>
          </div>
          <div className="projector-result">
            <span className="projector-result-label">Projected Nights</span>
            <span className="projector-result-value">{projection.projectedNights} / {projection.daysInMonth}</span>
          </div>
          <div className="projector-result highlight">
            <span className="projector-result-label">Projected Revenue</span>
            <span className="projector-result-value">{fmt(projection.projectedRevenue)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
