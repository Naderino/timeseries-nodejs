'use strict';

const { getClient } = require('./db');

/**
 * Fetches time series sales data with flexible aggregation options
 * @param {Object} options - Query options
 * @param {string} options.granularity - Time window granularity (day, week, month)
 * @param {string} options.startDate - Start date filter (YYYY-MM-DD)
 * @param {string} options.endDate - End date filter (YYYY-MM-DD)
 * @param {string} options.groupBy - Aggregation level (user or group)
 * @param {string} options.userId - Comma-separated user IDs to filter
 * @param {string} options.groupId - Comma-separated group IDs to filter
 * @returns {Promise<Array>} Time series sales data
 */
async function getTimeSeriesSales(options) {
  const {
    granularity = 'month',
    startDate,
    endDate,
    groupBy = 'user',
    userId,
    groupId
  } = options;

  const VALID_GRANULARITIES = ['day', 'week', 'month'];
  if (!VALID_GRANULARITIES.includes(granularity)) {
    throw new Error(`Invalid granularity: ${granularity}. Must be one of: ${VALID_GRANULARITIES.join(', ')}`);
  }

  const VALID_GROUP_BY = ['user', 'group'];
  if (!VALID_GROUP_BY.includes(groupBy)) {
    throw new Error(`Invalid groupBy: ${groupBy}. Must be one of: ${VALID_GROUP_BY.join(', ')}`);
  }

  const client = getClient();
  const params = [];
  let paramIndex = 1;

  let query;

  if (groupBy === 'user') {
    query = `
      SELECT
        DATE_TRUNC('${granularity}', s.date) as time_window,
        u.id as user_id,
        u.name as user_name,
        u.role as user_role,
        COUNT(s.id) as sale_count,
        SUM(s.amount) as total_revenue,
        ROUND(AVG(s.amount), 2) as avg_revenue,
        MIN(s.amount) as min_sale,
        MAX(s.amount) as max_sale
      FROM sales s
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
  } else {
    query = `
      SELECT
        DATE_TRUNC('${granularity}', s.date) as time_window,
        g.id as group_id,
        g.name as group_name,
        COUNT(s.id) as sale_count,
        SUM(s.amount) as total_revenue,
        ROUND(AVG(s.amount), 2) as avg_revenue,
        MIN(s.amount) as min_sale,
        MAX(s.amount) as max_sale
      FROM sales s
      JOIN users u ON s.user_id = u.id
      JOIN user_groups ug ON u.id = ug.user_id
      JOIN groups g ON ug.group_id = g.id
      WHERE 1=1
    `;
  }

  if (startDate) {
    query += ` AND s.date >= $${paramIndex++}`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND s.date <= $${paramIndex++}`;
    params.push(endDate);
  }

  if (userId && groupBy === 'user') {
    const userIds = userId.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (userIds.length > 0) {
      query += ` AND u.id = ANY($${paramIndex++}::int[])`;
      params.push(userIds);
    }
  }

  if (groupId && groupBy === 'group') {
    const groupIds = groupId.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (groupIds.length > 0) {
      query += ` AND g.id = ANY($${paramIndex++}::int[])`;
      params.push(groupIds);
    }
  }

  if (groupBy === 'user') {
    query += `
      GROUP BY time_window, u.id, u.name, u.role
      ORDER BY time_window DESC, total_revenue DESC
    `;
  } else {
    query += `
      GROUP BY time_window, g.id, g.name
      ORDER BY time_window DESC, total_revenue DESC
    `;
  }

  const result = await client.query(query, params);
  return result.rows;
}

/**
 * Formats raw database rows into a structured response
 * @param {Array} rows - Database query results
 * @param {string} groupBy - Aggregation level (user or group)
 * @returns {Array} Formatted data objects
 */

function formatTimeSeriesData(rows, groupBy) {
  return rows.map(row => ({
    timeWindow: row.time_window,
    ...(groupBy === 'user' ? {
      userId: row.user_id,
      userName: row.user_name,
      userRole: row.user_role
    } : {
      groupId: row.group_id,
      groupName: row.group_name
    }),
    metrics: {
      saleCount: parseInt(row.sale_count),
      totalRevenue: parseInt(row.total_revenue),
      avgRevenue: parseFloat(row.avg_revenue),
      minSale: parseInt(row.min_sale),
      maxSale: parseInt(row.max_sale)
    }
  }));
}

module.exports = {
  getTimeSeriesSales,
  formatTimeSeriesData
};
