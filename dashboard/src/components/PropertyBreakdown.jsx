import { useMemo } from 'react';

const COLORS = ['#ff5a5f', '#00a699', '#4a90d9', '#f5a623', '#7b61ff', '#e86c8d'];

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function PropertyBreakdown({ bookings }) {
  const stats = useMemo(() => {
    const properties = [...new Set(bookings.map(b => b.property))];
    const totalGross = bookings.reduce((s, b) => s + b.grossEarnings, 0);

    return properties.map((name, i) => {
      const propBookings = bookings.filter(b => b.property === name);
      const gross = propBookings.reduce((s, b) => s + b.grossEarnings, 0);
      const nights = propBookings.reduce((s, b) => s + b.nights, 0);
      return {
        name,
        color: COLORS[i % COLORS.length],
        gross,
        pct: totalGross > 0 ? (gross / totalGross * 100) : 0,
        bookings: propBookings.length,
        nights,
      };
    });
  }, [bookings]);

  return (
    <div className="chart-card">
      <h2>Property Comparison</h2>
      <div className="breakdown-list">
        {stats.map(s => (
          <div key={s.name} className="breakdown-item">
            <div className="breakdown-header">
              <span>{s.name}</span>
              <span>{fmt(s.gross)}</span>
            </div>
            <div className="breakdown-bar-bg">
              <div className="breakdown-bar-fill" style={{ width: `${s.pct}%`, background: s.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="breakdown-stats">
        {stats.map(s => (
          <div key={`b-${s.name}`} className="breakdown-stat">
            <div className="stat-label">{s.name} Bookings</div>
            <div className="stat-value" style={{ color: s.color }}>{s.bookings}</div>
          </div>
        ))}
        {stats.map(s => (
          <div key={`n-${s.name}`} className="breakdown-stat">
            <div className="stat-label">{s.name} Nights</div>
            <div className="stat-value" style={{ color: s.color }}>{s.nights}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
