import * as XLSX from 'xlsx';

const GROUP_DISPLAY = {
  'Trentalincome': 'Rental Income',
  'Tutilities': 'Utilities',
  'Tmaintenance': 'Maintenance',
  'tbusinessexpense': 'Business Expense',
  'Tsupplies': 'Supplies',
  'Tmortgage/insurance': 'Mortgage/Insurance',
  'Tsecuritydeposit': 'Security Deposit',
  'Treno/furnish': 'Reno/Furnish',
  'Tpurchase': 'Purchase',
  'Tcontribution/distribution': 'Contribution/Distribution',
  'Investment/Infuse': 'Investment/Infuse',
};

// Operating expense groups (for NOI calculation)
const OPERATING_EXPENSE_GROUPS = [
  'Tmaintenance', 'Tutilities', 'Tsupplies', 'tbusinessexpense'
];

export const EXPENSE_GROUP_COLORS = {
  'Maintenance': '#f97316',
  'Utilities': '#eab308',
  'Supplies': '#14b8a6',
  'Business Expense': '#ec4899',
  'Mortgage/Insurance': '#6366f1',
  'Reno/Furnish': '#a855f7',
  'Security Deposit': '#64748b',
  'Purchase': '#dc2626',
  'Contribution/Distribution': '#0ea5e9',
  'Investment/Infuse': '#84cc16',
};

export const PROPERTY_COLORS = [
  '#ff5a5f', '#00a699', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'
];

export function getGroupDisplayName(rawGroup) {
  return GROUP_DISPLAY[rawGroup] || rawGroup || 'Other';
}

export function parseKpiExcel(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  // Validate required sheets
  const sheetNames = wb.SheetNames;
  const gpSheetName = sheetNames.find(n => n.toLowerCase().includes('groups') || n.toLowerCase().includes('properties'));
  const txSheetName = sheetNames.find(n => n.toLowerCase().includes('transaction'));
  if (!gpSheetName) throw new Error("Missing 'Groups & Properties' sheet");
  if (!txSheetName) throw new Error("Missing 'Transactions' sheet");

  // Parse Groups & Properties sheet
  const gpRows = XLSX.utils.sheet_to_json(wb.Sheets[gpSheetName], { header: 1, defval: null, raw: true });

  // Build category → group map (columns A-B)
  const categoryToGroup = {};
  for (const row of gpRows) {
    if (row[0] && row[1] && typeof row[0] === 'string') {
      categoryToGroup[row[0]] = row[1];
    }
  }

  // Build tag → property map (columns E-F)
  const tagToProperty = {};
  for (const row of gpRows) {
    if (row[4] && row[5] && typeof row[4] === 'string') {
      tagToProperty[row[4]] = row[5];
    }
  }

  // Parse property metadata (columns I-O, starting from row with actual data)
  const properties = [];
  for (const row of gpRows) {
    const name = row[8];
    const type = row[9];
    if (!name || !type || typeof name !== 'string') continue;
    if (name === 'PROPERTY TYPE' || type === 'PROPERTY TYPE') continue;
    // Skip header-like rows
    if (name.includes('PROPERTY') || name.includes('NUMBER')) continue;

    const units = typeof row[10] === 'number' ? row[10] : 0;
    const datePurchased = row[11] instanceof Date ? row[11] : null;
    const currentValue = typeof row[12] === 'number' ? row[12] : 0;
    const mortgageBalance = typeof row[14] === 'number' ? row[14] : 0;
    const currentEquity = currentValue - mortgageBalance;

    properties.push({
      name, type, units, datePurchased, currentValue, currentEquity, mortgageBalance
    });
  }

  // Parse Transactions sheet
  const txRows = XLSX.utils.sheet_to_json(wb.Sheets[txSheetName], { header: 1, defval: null, raw: true, cellDates: true });

  // First row is header
  const transactions = [];
  for (let i = 1; i < txRows.length; i++) {
    const row = txRows[i];
    if (!row[0]) continue; // skip empty rows

    const date = row[0] instanceof Date ? row[0] : new Date(row[0]);
    if (isNaN(date.getTime())) continue;

    const category = row[2] || '';
    const tag = row[7] || '';
    const group = categoryToGroup[category] || null;
    const property = tag ? (tagToProperty[tag] || null) : null;

    transactions.push({
      date,
      merchant: row[1] || '',
      category,
      account: row[3] || '',
      originalStatement: row[4] || '',
      notes: row[5] || '',
      amount: typeof row[6] === 'number' ? row[6] : 0,
      tag,
      owner: row[8] || '',
      group,
      groupDisplay: getGroupDisplayName(group),
      property,
    });
  }

  // Sort transactions by date
  transactions.sort((a, b) => a.date - b.date);

  // Get unique months (sorted chronologically)
  const monthSet = new Set();
  for (const tx of transactions) {
    const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(key);
  }
  const months = [...monthSet].sort();

  // Get unique properties from transactions
  const propertyNames = [...new Set(transactions.filter(t => t.property).map(t => t.property))];

  // Get unique tags
  const tags = [...new Set(transactions.filter(t => t.tag).map(t => t.tag))];

  return {
    transactions,
    properties,
    categoryToGroup,
    tagToProperty,
    months,
    propertyNames,
    tags,
  };
}

// Format month key "YYYY-MM" to display string
export function formatMonth(monthKey) {
  const [year, month] = monthKey.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

export function formatMonthShort(monthKey) {
  const [, month] = monthKey.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthNames[parseInt(month) - 1];
}

export function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Compute monthly aggregations for Dashboard 1
export function computeMonthlySummary(transactions, months, selectedProperties) {
  // Filter transactions to selected properties (null property = "Other")
  const filtered = selectedProperties
    ? transactions.filter(t => selectedProperties.includes(t.property) || (t.property === null && selectedProperties.includes('Other')))
    : transactions;

  return months.map(monthKey => {
    const monthTxns = filtered.filter(t => getMonthKey(t.date) === monthKey);

    const byGroup = {};
    for (const tx of monthTxns) {
      const g = tx.group || '#N/A';
      byGroup[g] = (byGroup[g] || 0) + tx.amount;
    }

    const rentalIncome = byGroup['Trentalincome'] || 0;
    const maintenance = byGroup['Tmaintenance'] || 0;
    const utilities = byGroup['Tutilities'] || 0;
    const supplies = byGroup['Tsupplies'] || 0;
    const businessExpense = byGroup['tbusinessexpense'] || 0;
    const totalOpEx = maintenance + utilities + supplies + businessExpense;
    const noi = rentalIncome + totalOpEx;
    const mortgageInsurance = byGroup['Tmortgage/insurance'] || 0;
    const netCashFlow = noi + mortgageInsurance;
    const renoFurnish = byGroup['Treno/furnish'] || 0;
    const contribution = byGroup['Tcontribution/distribution'] || 0;
    const purchase = byGroup['Tpurchase'] || 0;
    const other = byGroup['#N/A'] || 0;

    return {
      month: monthKey,
      rentalIncome,
      maintenance,
      utilities,
      supplies,
      businessExpense,
      totalOpEx,
      noi,
      mortgageInsurance,
      netCashFlow,
      renoFurnish,
      contribution,
      purchase,
      other,
      grandTotal: Object.values(byGroup).reduce((s, v) => s + v, 0),
    };
  });
}

// Compute monthly data broken down by property (for stacked charts)
export function computeMonthlyByProperty(transactions, months, propertyNames) {
  const result = {};
  for (const monthKey of months) {
    result[monthKey] = {};
    for (const prop of propertyNames) {
      const txns = transactions.filter(t =>
        getMonthKey(t.date) === monthKey && t.property === prop
      );

      const byGroup = {};
      for (const tx of txns) {
        const g = tx.group || '#N/A';
        byGroup[g] = (byGroup[g] || 0) + tx.amount;
      }

      const rentalIncome = byGroup['Trentalincome'] || 0;
      const opEx = (byGroup['Tmaintenance'] || 0) + (byGroup['Tutilities'] || 0) +
                   (byGroup['Tsupplies'] || 0) + (byGroup['tbusinessexpense'] || 0);
      const noi = rentalIncome + opEx;
      const mortIns = byGroup['Tmortgage/insurance'] || 0;

      result[monthKey][prop] = {
        rentalIncome,
        totalOpEx: opEx,
        noi,
        netCashFlow: noi + mortIns,
        maintenance: byGroup['Tmaintenance'] || 0,
        utilities: byGroup['Tutilities'] || 0,
        supplies: byGroup['Tsupplies'] || 0,
        businessExpense: byGroup['tbusinessexpense'] || 0,
        mortgageInsurance: mortIns,
      };
    }
  }
  return result;
}

// Compute hierarchical data for Dashboard 2: property → tag → group → category → month values
export function computeDetailedHierarchy(transactions, months, tagToProperty) {
  const hierarchy = {};

  for (const tx of transactions) {
    const prop = tx.property || 'Other';
    const tag = tx.tag || 'Untagged';
    const group = tx.groupDisplay;
    const cat = tx.category;
    const monthKey = getMonthKey(tx.date);

    if (!hierarchy[prop]) hierarchy[prop] = { total: {}, tags: {} };
    if (!hierarchy[prop].tags[tag]) hierarchy[prop].tags[tag] = { total: {}, groups: {} };
    if (!hierarchy[prop].tags[tag].groups[group]) hierarchy[prop].tags[tag].groups[group] = { total: {}, categories: {} };
    if (!hierarchy[prop].tags[tag].groups[group].categories[cat]) hierarchy[prop].tags[tag].groups[group].categories[cat] = {};

    // Accumulate at all levels
    hierarchy[prop].total[monthKey] = (hierarchy[prop].total[monthKey] || 0) + tx.amount;
    hierarchy[prop].tags[tag].total[monthKey] = (hierarchy[prop].tags[tag].total[monthKey] || 0) + tx.amount;
    hierarchy[prop].tags[tag].groups[group].total[monthKey] = (hierarchy[prop].tags[tag].groups[group].total[monthKey] || 0) + tx.amount;
    hierarchy[prop].tags[tag].groups[group].categories[cat][monthKey] = (hierarchy[prop].tags[tag].groups[group].categories[cat][monthKey] || 0) + tx.amount;
  }

  return hierarchy;
}

export { OPERATING_EXPENSE_GROUPS };
