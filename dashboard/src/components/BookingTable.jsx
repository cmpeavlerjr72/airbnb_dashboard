import { useMemo } from 'react';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

export default function BookingTable({ bookings }) {
  const sorted = useMemo(() =>
    [...bookings].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)),
    [bookings]
  );

  return (
    <div className="table-card">
      <h2>All Upcoming Bookings ({sorted.length})</h2>
      <table className="booking-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Guest</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Nights</th>
            <th>Gross</th>
            <th>Net</th>
            <th>Service Fee</th>
            <th>Cleaning</th>
            <th>Taxes</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(b => (
            <tr key={b.confirmationCode}>
              <td>
                <span className={`property-tag ${b.property.toLowerCase()}`}>
                  {b.property === 'Bolton' ? 'Bolton' : 'Vickery'}
                </span>
              </td>
              <td>{b.guest}</td>
              <td>{formatDate(b.startDate)}</td>
              <td>{formatDate(b.endDate)}</td>
              <td>{b.nights}</td>
              <td className="amount-cell">{fmt(b.grossEarnings)}</td>
              <td className="amount-cell">{fmt(b.amount)}</td>
              <td>{fmt(b.serviceFee)}</td>
              <td>{fmt(b.cleaningFee)}</td>
              <td>{fmt(b.occupancyTaxes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
