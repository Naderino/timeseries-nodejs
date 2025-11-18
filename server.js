'use strict';

const express = require('express');
const seeder = require('./seed');
const salesRoutes = require('./routes/salesRoutes');

// Constants
const PORT = 3000;
const HOST = '0.0.0.0';

async function start() {
  // Seed the database
  await seeder.seedDatabase();

  // App
  const app = express();

  // Health check
  app.get('/health', (req, res) => {
    res.send('Hello World');
  });

  // Sales API routes
  app.use('/api/sales', salesRoutes);

  app.listen(PORT, HOST);
  console.log(`Server is running on http://${HOST}:${PORT}`);
}

start();
