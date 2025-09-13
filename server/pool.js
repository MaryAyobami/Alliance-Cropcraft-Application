require("dotenv").config();
const { Pool } = require("pg");
const schedule = require("node-schedule");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Use true with CA certificate in production
  },
  max: 10, // Stay within Supabase limits
  idleTimeoutMillis: 240000, // 4 minutes
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client:", err.message);
  if (err.message.includes("client_termination")) {
    console.log("Connection terminated by server, pool will refresh");
  }
});

// Test database connection with retry
const connectWithRetry = async (maxRetries = 5) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const client = await pool.connect();
      console.log("Database connection successful");
      client.release();
      return true;
    } catch (err) {
      retries++;
      console.error(`Database connection attempt ${retries} failed:`, err.message);
      if (retries === maxRetries) {
        console.error("Max retries reached. Database operations may fail.");
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
    }
  }
};

// Keep-alive query to prevent idle timeouts
schedule.scheduleJob("*/4 * * * *", async () => {
  try {
    await pool.query("SELECT 1");
    console.log("Keep-alive query sent");
  } catch (err) {
    console.error("Keep-alive query failed:", err.message);
  }
});

// Run initial connection test
connectWithRetry();

// Export queryWithRetry for use in other modules
async function queryWithRetry(text, params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await pool.query(text, params);
      return res;
    } catch (err) {
      console.error(`Query attempt ${i + 1} failed:`, err.message);
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

module.exports = { pool, queryWithRetry };