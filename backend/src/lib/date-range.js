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

const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateString = (value) => DATE_STRING_PATTERN.test(value) && !Number.isNaN(new Date(value).getTime());

module.exports = { buildDateRangeFilter, isValidDateString };
