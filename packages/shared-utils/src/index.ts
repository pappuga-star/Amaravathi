export function money(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function parseBatchCode(batchCode: string): {
  numberOfBags: number;
  month: number;
  year: number;
} {
  const parts = batchCode.split('/');
  if (parts.length < 3) {
    throw new Error(
      'Batch code must follow bags/month/year format, for example 30/12/25',
    );
  }
  const bags = Number(parts[0]);
  const month = Number(parts[1]);
  const part2 = parts[2] || '';
  const firstSplit = part2.split('-')[0] || '';
  const yearRaw = firstSplit.split('_')[0] || '';
  const year = Number(yearRaw);

  if (isNaN(bags) || isNaN(month) || isNaN(year) || bags <= 0 || month <= 0 || year <= 0) {
    throw new Error(
      'Batch code must follow bags/month/year format, for example 30/12/25',
    );
  }
  return { numberOfBags: bags, month, year: year < 100 ? 2000 + year : year };
}

export function generateBatchCode(
  numberOfBags: number,
  purchaseDate: Date | string,
): string {
  const date =
    purchaseDate instanceof Date ? purchaseDate : new Date(purchaseDate);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Purchase date is invalid');
  }
  const month = date.getMonth() + 1;
  const year = String(date.getFullYear()).slice(-2);
  return `${numberOfBags}/${month}/${year}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}
