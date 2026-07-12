const { buildDateRangeFilter } = require('../date-range');

describe('buildDateRangeFilter', () => {
  it('returns undefined when neither startDate nor endDate is given', () => {
    expect(buildDateRangeFilter(undefined, undefined)).toBeUndefined();
  });

  it('builds a gte filter from startDate only', () => {
    const result = buildDateRangeFilter('2026-07-01', undefined);
    expect(result.gte.toISOString().slice(0, 10)).toBe('2026-07-01');
    expect(result.lt).toBeUndefined();
  });

  it('builds an exclusive lt filter one day after endDate', () => {
    const result = buildDateRangeFilter(undefined, '2026-07-10');
    expect(result.lt.toISOString().slice(0, 10)).toBe('2026-07-11');
    expect(result.gte).toBeUndefined();
  });

  it('builds both gte and lt when both dates are given', () => {
    const result = buildDateRangeFilter('2026-07-01', '2026-07-10');
    expect(result.gte.toISOString().slice(0, 10)).toBe('2026-07-01');
    expect(result.lt.toISOString().slice(0, 10)).toBe('2026-07-11');
  });
});
