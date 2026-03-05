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

function totalBookingNights(b) {
  return Math.round((parseLocal(b.endDate) - parseLocal(b.startDate)) / (1000 * 60 * 60 * 24));
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

    // Compute ADR for each month
    return [...monthSet.values()]
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map(m => {
        let earnings = 0;
        let nights = 0;
        bookings.forEach(b => {
          const n = nightsInMonth(b.startDate, b.endDate, m.year, m.month);
          if (n > 0) {
            earnings += b.grossEarnings * (n / totalBookingNights(b));
            nights += n;
          }
        });
        return { ...m, adr: nights > 0 ? earnings / nights : 0 };
      });
  }, [bookings]);

  const activeMonth = selectedMonth || months[0] || null;

  const projection = useMemo(() => {
    if (!activeMonth) return null;
    const { year, month } = activeMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const properties = [...new Set(bookings.map(b => b.property))];

    // Calculate per-property
    const perProperty = properties.map(prop => {
      const propBookings = bookings.filter(b => b.property === prop);
      let earnings = 0;
      let nights = 0;

      propBookings.forEach(b => {
        const n = nightsInMonth(b.startDate, b.endDate, year, month);
        if (n > 0) {
          earnings += b.grossEarnings * (n / totalBookingNights(b));
          nights += n;
        }
      });

      const avgRate = nights > 0 ? earnings / nights : 0;
      const projNights = Math.round(daysInMonth * (occupancy / 100));
      const projRevenue = avgRate * projNights;

      return {
        property: prop,
        avgNightlyRate: avgRate,
        actualNights: nights,
        projectedNights: projNights,
        projectedRevenue: projRevenue,
      };
    }).filter(p => p.actualNights > 0);

    const numProperties = perProperty.length || 1;
    const totalAvailableNights = daysInMonth * numProperties;
    const totalActualNights = perProperty.reduce((s, p) => s + p.actualNights, 0);
    const totalProjectedNights = perProperty.reduce((s, p) => s + p.projectedNights, 0);
    const totalProjectedRevenue = perProperty.reduce((s, p) => s + p.projectedRevenue, 0);
    const combinedAvgRate = totalActualNights > 0
      ? perProperty.reduce((s, p) => s + p.avgNightlyRate * p.actualNights, 0) / totalActualNights
      : 0;

    return {
      daysInMonth,
      totalAvailableNights,
      totalActualNights,
      totalProjectedNights,
      totalProjectedRevenue,
      combinedAvgRate,
      perProperty,
      multiProperty: perProperty.length > 1,
    };
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
              <span>{MONTH_NAMES[m.month]} {m.year}</span>
              <span className="projector-month-adr">{fmt(m.adr)}/nt</span>
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
        <>
          {projection.multiProperty && (
            <div className="projector-breakdown">
              {projection.perProperty.map(p => (
                <div key={p.property} className="projector-breakdown-row">
                  <span className="projector-breakdown-name">{p.property}</span>
                  <span className="projector-breakdown-detail">
                    {fmt(p.avgNightlyRate)}/night &middot; {p.actualNights} booked &middot; {fmt(p.projectedRevenue)} projected
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="projector-results">
            <div className="projector-result">
              <span className="projector-result-label">
                {projection.multiProperty ? 'Weighted Avg Rate' : 'Avg Nightly Rate'}
              </span>
              <span className="projector-result-value">{fmt(projection.combinedAvgRate)}</span>
            </div>
            <div className="projector-result">
              <span className="projector-result-label">Actual Booked Nights</span>
              <span className="projector-result-value">{projection.totalActualNights} / {projection.totalAvailableNights}</span>
            </div>
            <div className="projector-result">
              <span className="projector-result-label">Projected Nights</span>
              <span className="projector-result-value">{projection.totalProjectedNights} / {projection.totalAvailableNights}</span>
            </div>
            <div className="projector-result highlight">
              <span className="projector-result-label">Projected Revenue</span>
              <span className="projector-result-value">{fmt(projection.totalProjectedRevenue)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
