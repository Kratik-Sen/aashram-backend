const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getPaginationOptions = (query) => {
  if (query.page === undefined && query.limit === undefined) return null;

  const page = parsePositiveInteger(query.page, 1);
  const limit = Math.min(parsePositiveInteger(query.limit, DEFAULT_LIMIT), MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
};

const paginatedResponse = async ({ req, res, query, countQuery }) => {
  const pagination = getPaginationOptions(req.query);
  if (!pagination) {
    const rows = await query;
    return res.json(rows);
  }

  const [data, total] = await Promise.all([
    query.skip(pagination.skip).limit(pagination.limit),
    countQuery
  ]);
  const totalPages = Math.ceil(total / pagination.limit);

  return res.json({
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasMore: pagination.page < totalPages
    }
  });
};

const paginatedArrayResponse = (req, res, rows) => {
  const pagination = getPaginationOptions(req.query);
  if (!pagination) return res.json(rows);

  const total = rows.length;
  const totalPages = Math.ceil(total / pagination.limit);

  return res.json({
    data: rows.slice(pagination.skip, pagination.skip + pagination.limit),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasMore: pagination.page < totalPages
    }
  });
};

module.exports = { paginatedArrayResponse, paginatedResponse };
