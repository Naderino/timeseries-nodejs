'use strict';

jest.mock('pg', () => {
  const mockConnect = jest.fn();
  const MockClient = jest.fn().mockImplementation(() => ({
    connect: mockConnect
  }));

  return {
    Client: MockClient
  };
});

const db = require('../services/db');
const { Client } = require('pg');

describe('Database Module', () => {
  describe('getClient', () => {
    it('should return a database client', () => {
      const client = db.getClient();

      expect(client).toBeDefined();
      expect(client.connect).toBeDefined();
    });

    it('should return the same client instance on multiple calls (singleton)', () => {
      const client1 = db.getClient();
      const client2 = db.getClient();

      expect(client1).toBe(client2);
    });

    it('should call connect on the client', () => {
      const client = db.getClient();

      expect(client.connect).toHaveBeenCalled();
    });

    it('should have been called with configuration object', () => {
      // The Client constructor should have been called with a config object
      expect(Client).toHaveBeenCalled();

      const callArgs = Client.mock.calls[0][0];

      // Verify the config has the expected keys
      expect(callArgs).toHaveProperty('host');
      expect(callArgs).toHaveProperty('port');
      expect(callArgs).toHaveProperty('user');
      expect(callArgs).toHaveProperty('password');
      expect(callArgs).toHaveProperty('database');
    });
  });
});
