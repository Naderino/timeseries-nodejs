# Actifai Engineering Takehome

## Introduction

You are an Actifai backend engineer managing a database of our users - who are call center agents - and the sales that
the users place using our application.

The database has 4 tables:

- `users`: who are the users (name, role)
- `groups`: groups of users
- `user_groups`: which users belong to which groups
- `sales`: who made a sale, for how much, and when was it made

The front-end team has decided to build an analytics and reporting dashboard to display information about performance
to our users. They are interested in tracking which users and groups are performing well (in terms of their sales). The
primary metric they have specified as a requirement is average revenue and total revenue by user and group, for a given
month.

Your job is to build the API that will deliver data to this dashboard. In addition to the stated requirements above, we
would like to see you think about what additional data/metrics would be useful to add.

At a minimum, write one endpoint that returns time series data for user sales i.e. a list of rows, where each row
corresponds to a time window and information about sales. When you design the endpoint, think  about what query
parameters and options you want to support, to allow flexibility for the front-end team.

## Codebase

This repository contains a bare-bones Node/Express server, which is defined in `server.js`. This file is where you will
define your endpoints.

## Getting started

1. Install Docker (if you don't already have it)
2. Run `npm i` to install dependencies
3. Run `docker-compose up` to compile and run the images.
4. You now have a database and server running on your machine. You can test it by navigating to `http://localhost:3000/health` in
your browser. You should see a "Hello World" message.

## API Endpoints

### GET `/api/sales/timeseries`

Returns time series sales data aggregated by time windows.

**Query Parameters:**
- `granularity` (optional): Time window size - `day`, `week`, or `month`. Default: `month`
- `groupBy` (optional): Aggregation level - `user` or `group`. Default: `user`
- `startDate` (optional): Filter sales from this date (YYYY-MM-DD format)
- `endDate` (optional): Filter sales until this date (YYYY-MM-DD format)
- `userId` (optional): Comma-separated user IDs to filter (only with `groupBy=user`)
- `groupId` (optional): Comma-separated group IDs to filter (only with `groupBy=group`)

**Example Requests:**

# Get monthly sales by user
curl "http://localhost:3000/api/sales/timeseries?granularity=month&groupBy=user"

# Get weekly sales for a specific user
curl "http://localhost:3000/api/sales/timeseries?granularity=week&groupBy=user&userId=1"

# Get monthly sales by group with date range
curl "http://localhost:3000/api/sales/timeseries?granularity=month&groupBy=group&startDate=2021-06-01&endDate=2021-08-31"

# Get daily sales for multiple users
curl "http://localhost:3000/api/sales/timeseries?granularity=day&groupBy=user&userId=1,2,3"

**Response Format:**

{
  "granularity": "month",
  "groupBy": "user",
  "filters": {
    "startDate": "2021-06-01",
    "endDate": "2021-08-31",
    "userId": "1",
    "groupId": null
  },
  "data": [
    {
      "timeWindow": "2021-08-01T00:00:00.000Z",
      "userId": 1,
      "userName": "Alice",
      "userRole": "Call Center Agent",
      "metrics": {
        "saleCount": 25,
        "totalRevenue": 613515,
        "avgRevenue": 24540.6,
        "minSale": 1089,
        "maxSale": 47707
      }
    }
  ]
}

**Metrics Provided:**
- `saleCount`: Number of sales in the time window
- `totalRevenue`: Sum of all sale amounts
- `avgRevenue`: Average sale amount
- `minSale`: Smallest sale amount
- `maxSale`: Largest sale amount

## Running Tests

npm test                # Run all tests
npm run test:coverage   # Run tests with coverage report

## Help

If you have any questions, feel free to reach out to your interview scheduler for clarification!
