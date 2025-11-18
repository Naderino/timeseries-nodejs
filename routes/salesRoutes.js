'use strict';

const express = require('express');
const salesService = require('../services/salesService');

const router = express.Router();

// Valid options for query parameters
const VALID_GRANULARITIES = ['day', 'week', 'month'];
const VALID_GROUP_BY = ['user', 'group'];

/**
 * GET /api/sales/timeseries
 * Returns time series sales data aggregated by time windows
 *
 * Query Parameters:
 * - granularity: day|week|month (default: month)
 * - groupBy: user|group (default: user)
 * - startDate: YYYY-MM-DD format
 * - endDate: YYYY-MM-DD format
 * - userId: comma-separated user IDs (only with groupBy=user)
 * - groupId: comma-separated group IDs (only with groupBy=group)
 */
router.get('/timeseries', async (req, res) => {
  try {
    const {
      granularity = 'month',
      startDate,
      endDate,
      groupBy = 'user',
      userId,
      groupId
    } = req.query;

    // Validate granularity
    if (!VALID_GRANULARITIES.includes(granularity)) {
      return res.status(400).json({
        error: `Invalid granularity. Must be one of: ${VALID_GRANULARITIES.join(', ')}`
      });
    }

    // Validate groupBy
    if (!VALID_GROUP_BY.includes(groupBy)) {
      return res.status(400).json({
        error: `Invalid groupBy. Must be one of: ${VALID_GROUP_BY.join(', ')}`
      });
    }

    // Fetch data from service
    const rows = await salesService.getTimeSeriesSales({
      granularity,
      startDate,
      endDate,
      groupBy,
      userId,
      groupId
    });

    // Format and send response
    const response = {
      granularity,
      groupBy,
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        userId: userId || null,
        groupId: groupId || null
      },
      data: salesService.formatTimeSeriesData(rows, groupBy)
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching sales timeseries:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
