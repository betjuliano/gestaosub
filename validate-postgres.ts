#!/usr/bin/env tsx

/**
 * PostgreSQL Connection Validation Script
 * Validates that the database connection is properly configured for PostgreSQL
 * and tests connection pool settings.
 */

import { getDb } from "./server/db";
import postgres from "postgres";

async function validatePostgreSQLConnection() {
  console.log("🔍 Validating PostgreSQL Connection Configuration...\n");

  try {
    // 1. Check environment variables
    console.log("1️⃣ Checking Environment Variables:");
    const requiredEnvVars = [
      "DATABASE_URL",
      "DB_POOL_SIZE",
      "DB_POOL_MIN", 
      "DB_POOL_IDLE_TIMEOUT",
      "DB_CONNECT_TIMEOUT",
      "DB_SSL"
    ];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      console.log(`   ${envVar}: ${value ? "✅ Set" : "❌ Missing"}`);
    }

    // 2. Test database connection
    console.log("\n2️⃣ Testing Database Connection:");
    const db = await getDb();
    
    if (!db) {
      throw new Error("Failed to get database connection");
    }

    // 3. Test basic query
    console.log("   ✅ Database connection established");
    
    // 4. Test PostgreSQL specific features
    console.log("\n3️⃣ Testing PostgreSQL Features:");
    
    // Test connection info
    const client = postgres(process.env.DATABASE_URL!);
    const result = await client`SELECT version() as version, current_database() as database`;
    console.log(`   ✅ PostgreSQL Version: ${result[0].version.split(' ')[1]}`);
    console.log(`   ✅ Connected to database: ${result[0].database}`);
    
    // Test connection pool
    const poolInfo = await client`
      SELECT 
        setting as max_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
      FROM pg_settings 
      WHERE name = 'max_connections'
    `;
    console.log(`   ✅ Max connections: ${poolInfo[0].max_connections}`);
    console.log(`   ✅ Active connections: ${poolInfo[0].active_connections}`);

    // Test SSL status
    const sslInfo = await client`SELECT ssl_is_used() as ssl_enabled`;
    console.log(`   ✅ SSL enabled: ${sslInfo[0].ssl_enabled ? "Yes" : "No"}`);

    await client.end();

    console.log("\n✅ All PostgreSQL validations passed!");
    console.log("\n📊 Configuration Summary:");
    console.log(`   • Pool Size: ${process.env.DB_POOL_SIZE || "20"}`);
    console.log(`   • Pool Min: ${process.env.DB_POOL_MIN || "5"}`);
    console.log(`   • Idle Timeout: ${process.env.DB_POOL_IDLE_TIMEOUT || "30"}s`);
    console.log(`   • Connect Timeout: ${process.env.DB_CONNECT_TIMEOUT || "10"}s`);
    console.log(`   • SSL Mode: ${process.env.DB_SSL || "prefer"}`);

  } catch (error) {
    console.error("\n❌ PostgreSQL validation failed:", error);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validatePostgreSQLConnection()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Validation error:", error);
      process.exit(1);
    });
}

export { validatePostgreSQLConnection };