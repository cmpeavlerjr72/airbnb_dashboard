import { useMemo } from 'react';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function SummaryCards({ bookings }) {
  const stats = useMemo(() => {
    const totalGross = bookings.reduce((s, b) => s + b.grossEarnings, 0);
    const totalNet = bookings.reduce((s, b) => s + b.amount, 0);
    const totalNights = bookings.reduce((s, b) => s + b.nights, 0);
    const totalTaxes = bookings.reduce((s, b) => s + b.occupancyTaxes, 0);
    const totalCleaning = bookings.reduce((s, b) => s + b.cleaningFee, 0);
    const totalServiceFee = bookings.reduce((s, b) => s + b.serviceFee, 0);
    const avgPerNight = totalNights > 0 ? totalNet / totalNights : 0;

    return {
      totalBookings: bookings.length,
      totalGross,
      totalNet,
      totalNights,
      totalTaxes,
      totalCleaning,
      totalServiceFee,
      avgPerNight,
    };
  }, [bookings]);

  return (
    <div className="summary-cards">
      <div className="summary-card">
        <div className="label">Total Bookings</div>
        <div className="value">{stats.totalBookings}</div>
        <div className="sub">{stats.totalNights} total nights</div>
      </div>
      <div className="summary-card">
        <div className="label">Gross Earnings</div>
        <div className="value">{fmt(stats.totalGross)}</div>
        <div className="sub">Before fees & taxes</div>
      </div>
      <div className="summary-card">
        <div className="label">Net to You</div>
        <div className="value">{fmt(stats.totalNet)}</div>
        <div className="sub">After service fees</div>
      </div>
      <div className="summary-card">
        <div className="label">Avg / Night</div>
        <div className="value">{fmt(stats.avgPerNight)}</div>
        <div className="sub">Net per booked night</div>
      </div>
      <div className="summary-card">
        <div className="label">Service Fees</div>
        <div className="value">{fmt(stats.totalServiceFee)}</div>
        <div className="sub">Paid to Airbnb</div>
      </div>
      <div className="summary-card">
        <div className="label">Occupancy Taxes</div>
        <div className="value">{fmt(stats.totalTaxes)}</div>
        <div className="sub">Collected for taxes</div>
      </div>
    </div>
  );
}
