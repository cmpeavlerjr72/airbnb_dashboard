/**
 * Parse Airbnb CSV export text into booking objects.
 * Expects the standard Airbnb "Future reservations" CSV format.
 */

function convertDate(mmddyyyy) {
  // MM/DD/YYYY -> YYYY-MM-DD
  const [m, d, y] = mmddyyyy.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function num(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export function parseCsv(csvText, propertyName) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const colIndex = {};
  headers.forEach((h, i) => { colIndex[h.trim()] = i; });

  const bookings = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV split (handles our data which has no commas in fields)
    const cols = line.split(',');

    const type = cols[colIndex['Type']]?.trim();
    if (type && type !== 'Reservation') continue;

    bookings.push({
      property: propertyName,
      confirmationCode: cols[colIndex['Confirmation code']]?.trim() || '',
      bookingDate: convertDate(cols[colIndex['Booking date']]?.trim()),
      startDate: convertDate(cols[colIndex['Start date']]?.trim()),
      endDate: convertDate(cols[colIndex['End date']]?.trim()),
      nights: parseInt(cols[colIndex['Nights']], 10) || 0,
      guest: cols[colIndex['Guest']]?.trim() || '',
      amount: num(cols[colIndex['Amount']]),
      serviceFee: num(cols[colIndex['Service fee']]),
      cleaningFee: num(cols[colIndex['Cleaning fee']]),
      petFee: num(cols[colIndex['Pet fee']]),
      grossEarnings: num(cols[colIndex['Gross earnings']]),
      occupancyTaxes: num(cols[colIndex['Occupancy taxes']]),
    });
  }

  return bookings;
}

export function guessPropertyName(filename) {
  // Strip extension and common path separators
  const name = filename.replace(/\.csv$/i, '').replace(/.*[/\\]/, '');
  return name;
}
