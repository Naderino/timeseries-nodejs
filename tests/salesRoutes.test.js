'use strict';

const request = require('supertest');
const express = require('express');
const salesRoutes = require('../routes/salesRoutes');
const salesService = require('../services/salesService');

jest.mock('../services/salesService');

describe('Sales Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use('/api/sales', salesRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/sales/timeseries', () => {
    describe('successful requests', () => {
      it('should return time series data with default parameters', async () => {
        const mockRows = [
          {
            time_window: '2021-12-01T00:00:00.000Z',
            user_id: 1,
            user_name: 'Alice',
            user_role: 'Agent',
            sale_count: '10',
            total_revenue: '50000',
            avg_revenue: '5000.00',
            min_sale: '1000',
            max_sale: '10000'
          }
        ];

        const formattedData = [
          {
            timeWindow: '2021-12-01T00:00:00.000Z',
            userId: 1,
            userName: 'Alice',
            userRole: 'Agent',
            metrics: {
              saleCount: 10,
              totalRevenue: 50000,
              avgRevenue: 5000.00,
              minSale: 1000,
              maxSale: 10000
            }
          }
        ];

        salesService.getTimeSeriesSales.mockResolvedValue(mockRows);
        salesService.formatTimeSeriesData.mockReturnValue(formattedData);

        const response = await request(app)
          .get('/api/sales/timeseries')
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body).toEqual({
          granularity: 'month',
          groupBy: 'user',
          filters: {
            startDate: null,
            endDate: null,
            userId: null,
            groupId: null
          },
          data: formattedData
        });

        expect(salesService.getTimeSeriesSales).toHaveBeenCalledWith({
          granularity: 'month',
          groupBy: 'user',
          startDate: undefined,
          endDate: undefined,
          userId: undefined,
          groupId: undefined
        });

        expect(salesService.formatTimeSeriesData).toHaveBeenCalledWith(mockRows, 'user');
      });

      it('should handle custom granularity parameter', async () => {
        salesService.getTimeSeriesSales.mockResolvedValue([]);
        salesService.formatTimeSeriesData.mockReturnValue([]);

        const response = await request(app)
          .get('/api/sales/timeseries?granularity=day')
          .expect(200);

        expect(response.body.granularity).toBe('day');
        expect(salesService.getTimeSeriesSales).toHaveBeenCalledWith(
          expect.objectContaining({ granularity: 'day' })
        );
      });

      it('should handle groupBy=group parameter', async () => {
        const mockRows = [
          {
            time_window: '2021-12-01T00:00:00.000Z',
            group_id: 1,
            group_name: 'Sales Team',
            sale_count: '50',
            total_revenue: '250000',
            avg_revenue: '5000.00',
            min_sale: '500',
            max_sale: '15000'
          }
        ];

        const formattedData = [
          {
            timeWindow: '2021-12-01T00:00:00.000Z',
            groupId: 1,
            groupName: 'Sales Team',
            metrics: {
              saleCount: 50,
              totalRevenue: 250000,
              avgRevenue: 5000.00,
              minSale: 500,
              maxSale: 15000
            }
          }
        ];

        salesService.getTimeSeriesSales.mockResolvedValue(mockRows);
        salesService.formatTimeSeriesData.mockReturnValue(formattedData);

        const response = await request(app)
          .get('/api/sales/timeseries?groupBy=group')
          .expect(200);

        expect(response.body.groupBy).toBe('group');
        expect(salesService.formatTimeSeriesData).toHaveBeenCalledWith(mockRows, 'group');
      });

      it('should handle date filters', async () => {
        salesService.getTimeSeriesSales.mockResolvedValue([]);
        salesService.formatTimeSeriesData.mockReturnValue([]);

        const response = await request(app)
          .get('/api/sales/timeseries?startDate=2021-01-01&endDate=2021-12-31')
          .expect(200);

        expect(response.body.filters.startDate).toBe('2021-01-01');
        expect(response.body.filters.endDate).toBe('2021-12-31');
        expect(salesService.getTimeSeriesSales).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2021-01-01',
            endDate: '2021-12-31'
          })
        );
      });

      it('should handle userId filter', async () => {
        salesService.getTimeSeriesSales.mockResolvedValue([]);
        salesService.formatTimeSeriesData.mockReturnValue([]);

        const response = await request(app)
          .get('/api/sales/timeseries?userId=1,2,3')
          .expect(200);

        expect(response.body.filters.userId).toBe('1,2,3');
        expect(salesService.getTimeSeriesSales).toHaveBeenCalledWith(
          expect.objectContaining({ userId: '1,2,3' })
        );
      });

      it('should handle groupId filter', async () => {
        salesService.getTimeSeriesSales.mockResolvedValue([]);
        salesService.formatTimeSeriesData.mockReturnValue([]);

        const response = await request(app)
          .get('/api/sales/timeseries?groupBy=group&groupId=1,2')
          .expect(200);

        expect(response.body.filters.groupId).toBe('1,2');
        expect(salesService.getTimeSeriesSales).toHaveBeenCalledWith(
          expect.objectContaining({ groupId: '1,2' })
        );
      });

      it('should handle all parameters together', async () => {
        salesService.getTimeSeriesSales.mockResolvedValue([]);
        salesService.formatTimeSeriesData.mockReturnValue([]);

        await request(app)
          .get('/api/sales/timeseries?granularity=week&groupBy=user&startDate=2021-06-01&endDate=2021-08-31&userId=5,10')
          .expect(200);

        expect(salesService.getTimeSeriesSales).toHaveBeenCalledWith({
          granularity: 'week',
          groupBy: 'user',
          startDate: '2021-06-01',
          endDate: '2021-08-31',
          userId: '5,10',
          groupId: undefined
        });
      });
    });

    describe('validation errors', () => {
      it('should return 400 for invalid granularity', async () => {
        const response = await request(app)
          .get('/api/sales/timeseries?granularity=invalid')
          .expect(400);

        expect(response.body).toEqual({
          error: 'Invalid granularity. Must be one of: day, week, month'
        });

        expect(salesService.getTimeSeriesSales).not.toHaveBeenCalled();
      });

      it('should return 400 for invalid groupBy', async () => {
        const response = await request(app)
          .get('/api/sales/timeseries?groupBy=invalid')
          .expect(400);

        expect(response.body).toEqual({
          error: 'Invalid groupBy. Must be one of: user, group'
        });

        expect(salesService.getTimeSeriesSales).not.toHaveBeenCalled();
      });

      it('should validate granularity before groupBy', async () => {
        const response = await request(app)
          .get('/api/sales/timeseries?granularity=invalid&groupBy=invalid')
          .expect(400);

        expect(response.body.error).toContain('granularity');
      });
    });

    describe('edge cases', () => {
      it('should handle empty result set', async () => {
        salesService.getTimeSeriesSales.mockResolvedValue([]);
        salesService.formatTimeSeriesData.mockReturnValue([]);

        const response = await request(app)
          .get('/api/sales/timeseries')
          .expect(200);

        expect(response.body.data).toEqual([]);
      });

      it('should handle case-sensitive parameters', async () => {
        const response = await request(app)
          .get('/api/sales/timeseries?granularity=Month')
          .expect(400);

        expect(response.body.error).toContain('Invalid granularity');
      });

      it('should accept week granularity', async () => {
        salesService.getTimeSeriesSales.mockResolvedValue([]);
        salesService.formatTimeSeriesData.mockReturnValue([]);

        await request(app)
          .get('/api/sales/timeseries?granularity=week')
          .expect(200);

        expect(salesService.getTimeSeriesSales).toHaveBeenCalledWith(
          expect.objectContaining({ granularity: 'week' })
        );
      });
    });

    describe('error handling', () => {
      it('should return 500 when service throws an error', async () => {
        salesService.getTimeSeriesSales.mockRejectedValue(
          new Error('Database connection failed')
        );

        const response = await request(app)
          .get('/api/sales/timeseries')
          .expect(500);

        expect(response.body).toEqual({
          error: 'Internal server error',
          message: 'Database connection failed'
        });
      });

      it('should handle formatting errors', async () => {
        salesService.getTimeSeriesSales.mockResolvedValue([{ some: 'data' }]);
        salesService.formatTimeSeriesData.mockImplementation(() => {
          throw new Error('Formatting failed');
        });

        const response = await request(app)
          .get('/api/sales/timeseries')
          .expect(500);

        expect(response.body.error).toBe('Internal server error');
        expect(response.body.message).toBe('Formatting failed');
      });

      it('should log errors to console', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        salesService.getTimeSeriesSales.mockRejectedValue(
          new Error('Test error')
        );

        await request(app)
          .get('/api/sales/timeseries')
          .expect(500);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching sales timeseries:',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });
    });
  });
});
