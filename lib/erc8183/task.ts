/** Build the seller `task_description` from the activate modal fields. */
export function buildTaskFromParams(params: Record<string, string>, fallback: string): string {
  if (params.task?.trim()) return params.task.trim();
  const gridCount = params.gridCount || params.grid_count;
  const lower = params.lowerPrice || params.lower_price;
  const upper = params.upperPrice || params.upper_price;
  const cap = params.budgetCap || params.budget_cap || params.capital_cap;
  if (gridCount && lower && upper) {
    const capBit = cap ? `. Capital cap ${cap} U` : '';
    return `Run a BNB/USDT grid with ${gridCount} levels between ${lower} and ${upper} USDT${capBit}`;
  }
  const borrower = params.borrower || params.borrowerAddress || params.address;
  const protocol = params.protocol || 'Venus';
  const threshold = params.hfThreshold || params.hf_threshold || params.threshold;
  if (borrower || params.protocol || threshold) {
    const who = borrower?.trim() || 'no address';
    const hf = threshold?.trim() || '1.2';
    return `Check ${protocol} health factor for ${who} (threshold ${hf})`;
  }
  return fallback;
}
