const buildDateRangeFilter = (startDate, endDate) => {
  if (!startDate && !endDate) return undefined;

  const range = {};
  if (startDate) range.gte = new Date(`${startDate}T00:00:00Z`);
  if (endDate) {
    const end = new Date(`${endDate}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    range.lt = end;
  }
  return range;
};

module.exports = { buildDateRangeFilter };
