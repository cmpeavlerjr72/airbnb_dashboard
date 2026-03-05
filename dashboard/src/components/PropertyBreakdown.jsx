import { useMemo } from 'react';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function PropertyBreakdown({ bookings }) {
  const stats = useMemo(() => {
    const bolton = bookings.filter(b => b.property === 'Bolton');
    const vickery = bookings.filter(b => b.property === 'Vickery');

    const boltonGross = bolton.reduce((s, b) => s + b.grossEarnings, 0);
    const vickeryGross = vickery.reduce((s, b) => s + b.grossEarnings, 0);
    const total = boltonGross + vickeryGross;

    const boltonNights = bolton.reduce((s, b) => s + b.nights, 0);
    const vickeryNights = vickery.reduce((s, b) => s + b.nights, 0);

    return {
      bolton: { gross: boltonGross, pct: total > 0 ? (boltonGross / total * 100) : 0, bookings: bolton.length, nights: boltonNights },
      vickery: { gross: vickeryGross, pct: total > 0 ? (vickeryGross / total * 100) : 0, bookings: vickery.length, nights: vickeryNights },
    };
  }, [bookings]);

  return (
    <div className="chart-card">
      <h2>Property Comparison</h2>
      <div className="breakdown-list">
        <div className="breakdown-item">
          <div className="breakdown-header">
            <span>539 Bolton</span>
            <span>{fmt(stats.bolton.gross)}</span>
          </div>
          <div className="breakdown-bar-bg">
            <div className="breakdown-bar-fill" style={{ width: `${stats.bolton.pct}%`, background: '#ff5a5f' }} />
          </div>
        </div>
        <div className="breakdown-item">
          <div className="breakdown-header">
            <span>Vickery Lane</span>
            <span>{fmt(stats.vickery.gross)}</span>
          </div>
          <div className="breakdown-bar-bg">
            <div className="breakdown-bar-fill" style={{ width: `${stats.vickery.pct}%`, background: '#00a699' }} />
          </div>
        </div>
      </div>
      <div className="breakdown-stats">
        <div className="breakdown-stat">
          <div className="stat-label">Bolton Bookings</div>
          <div className="stat-value" style={{ color: '#ff5a5f' }}>{stats.bolton.bookings}</div>
        </div>
        <div className="breakdown-stat">
          <div className="stat-label">Vickery Bookings</div>
          <div className="stat-value" style={{ color: '#00a699' }}>{stats.vickery.bookings}</div>
        </div>
        <div className="breakdown-stat">
          <div className="stat-label">Bolton Nights</div>
          <div className="stat-value" style={{ color: '#ff5a5f' }}>{stats.bolton.nights}</div>
        </div>
        <div className="breakdown-stat">
          <div className="stat-label">Vickery Nights</div>
          <div className="stat-value" style={{ color: '#00a699' }}>{stats.vickery.nights}</div>
        </div>
      </div>
    </div>
  );
}
