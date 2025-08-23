const { Pool } = require("pg")

// Database connection with environment variable fallback
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.nobbtyhwmjgfeiwpcduk:bams060704@aws-0-eu-north-1.pooler.supabase.com:5432/postgres",
})

module.exports = { pool }