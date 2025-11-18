'use strict';

const salesService = require('../services/salesService');
const db = require('../services/db');

jest.mock('../services/db');

describe('SalesService', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn()
    };
    db.getClient.mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTimeSeriesSales', () => {
    describe('groupBy user', () => {
      it('should fetch sales data grouped by user with default parameters', async () => {
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

        mockClient.query.mockResolvedValue({ rows: mockRows });

        const result = await salesService.getTimeSeriesSales({
          granularity: 'month',
          groupBy: 'user'
        });

        expect(result).toEqual(mockRows);
        expect(mockClient.query).toHaveBeenCalledTimes(1);

        // Verify the query structure
        const call = mockClient.query.mock.calls[0];
        expect(call[0]).toContain('DATE_TRUNC');
        expect(call[0]).toContain("DATE_TRUNC('month'");
        expect(call[0]).toContain('FROM sales s');
        expect(call[0]).toContain('JOIN users u');
        expect(call[0]).toContain('GROUP BY time_window, u.id, u.name, u.role');
        expect(call[1]).toEqual([]);
      });

      it('should apply date filters when provided', async () => {
        mockClient.query.mockResolvedValue({ rows: [] });

        await salesService.getTimeSeriesSales({
          granularity: 'day',
          groupBy: 'user',
          startDate: '2021-01-01',
          endDate: '2021-12-31'
        });

        const call = mockClient.query.mock.calls[0];
        expect(call[0]).toContain('s.date >= $1');
        expect(call[0]).toContain('s.date <= $2');
        expect(call[1]).toEqual(['2021-01-01', '2021-12-31']);
      });

      it('should filter by userId when provided', async () => {
        mockClient.query.mockResolvedValue({ rows: [] });

        await salesService.getTimeSeriesSales({
          granularity: 'week',
          groupBy: 'user',
          userId: '1,2,3'
        });

        const call = mockClient.query.mock.calls[0];
        expect(call[0]).toContain('u.id = ANY($1::int[])');
        expect(call[1]).toEqual([[1, 2, 3]]);
      });
    });

    describe('groupBy group', () => {
      it('should fetch sales data grouped by group', async () => {
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

        mockClient.query.mockResolvedValue({ rows: mockRows });

        const result = await salesService.getTimeSeriesSales({
          granularity: 'month',
          groupBy: 'group'
        });

        expect(result).toEqual(mockRows);

        const call = mockClient.query.mock.calls[0];
        expect(call[0]).toContain('JOIN user_groups ug');
        expect(call[0]).toContain('JOIN groups g');
        expect(call[0]).toContain('GROUP BY time_window, g.id, g.name');
      });

      it('should filter by groupId when provided', async () => {
        mockClient.query.mockResolvedValue({ rows: [] });

        await salesService.getTimeSeriesSales({
          granularity: 'month',
          groupBy: 'group',
          groupId: '1,2'
        });

        const call = mockClient.query.mock.calls[0];
        expect(call[0]).toContain('g.id = ANY($1::int[])');
        expect(call[1]).toEqual([[1, 2]]);
      });
    });

    describe('combined filters', () => {
      it('should apply all filters together', async () => {
        mockClient.query.mockResolvedValue({ rows: [] });

        await salesService.getTimeSeriesSales({
          granularity: 'day',
          groupBy: 'user',
          startDate: '2021-06-01',
          endDate: '2021-08-31',
          userId: '5,10,15'
        });

        const call = mockClient.query.mock.calls[0];
        expect(call[0]).toContain('s.date >= $1');
        expect(call[0]).toContain('s.date <= $2');
        expect(call[0]).toContain('u.id = ANY($3::int[])');
        expect(call[1]).toEqual(['2021-06-01', '2021-08-31', [5, 10, 15]]);
      });
    });

    describe('error handling', () => {
      it('should propagate database errors', async () => {
        const dbError = new Error('Database connection failed');
        mockClient.query.mockRejectedValue(dbError);

        await expect(
          salesService.getTimeSeriesSales({ granularity: 'month', groupBy: 'user' })
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('security - SQL injection prevention', () => {
      it('should reject invalid granularity values (SQL injection attempt)', async () => {
        await expect(
          salesService.getTimeSeriesSales({
            granularity: "day'); DROP TABLE sales; --",
            groupBy: 'user'
          })
        ).rejects.toThrow('Invalid granularity');

        expect(mockClient.query).not.toHaveBeenCalled();
      });

      it('should reject invalid groupBy values (SQL injection attempt)', async () => {
        await expect(
          salesService.getTimeSeriesSales({
            granularity: 'month',
            groupBy: "user'; DELETE FROM users; --"
          })
        ).rejects.toThrow('Invalid groupBy');

        expect(mockClient.query).not.toHaveBeenCalled();
      });

      it('should sanitize userId input by parsing to integers', async () => {
        mockClient.query.mockResolvedValue({ rows: [] });

        // Test with SQL injection attempts in userId
        await salesService.getTimeSeriesSales({
          granularity: 'month',
          groupBy: 'user',
          userId: "1; DROP TABLE users; --, 2, invalid, 3"
        });

        const call = mockClient.query.mock.calls[0];
        expect(call[1]).toEqual([[1, 2, 3]]);
      });
    });
  });

  describe('formatTimeSeriesData', () => {
    it('should format user-grouped data correctly', () => {
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

      const result = salesService.formatTimeSeriesData(mockRows, 'user');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
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
      });
    });

    it('should format group-grouped data correctly', () => {
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

      const result = salesService.formatTimeSeriesData(mockRows, 'group');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
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
      });
      expect(result[0]).not.toHaveProperty('userId');
      expect(result[0]).not.toHaveProperty('userName');
      expect(result[0]).not.toHaveProperty('userRole');
    });
  });
});
