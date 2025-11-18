'use strict';

const { Client } = require('pg');

// Create a singleton database client
let client = null;

function getClient() {
  if (!client) {
    client = new Client({
      host: process.env.DB_HOST || 'db',
      port: process.env.DB_PORT || '5432',
      user: process.env.DB_USER || 'user',
      password: process.env.DB_PASSWORD || 'pass',
      database: process.env.DB_NAME || 'actifai'
    });
    client.connect();
  }
  return client;
}

module.exports = {
  getClient
};
