import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
let db: any = null;
let isDbConnected = false;

if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️  DATABASE_URL is not set. Database operations will be unavailable. " +
    "Please configure DATABASE_URL in production deployment settings."
  );
  isDbConnected = false;
} else {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    isDbConnected = true;
    console.log("✅ Database connection initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize database connection:", error);
    console.warn("⚠️  Database operations will be unavailable");
    isDbConnected = false;
  }
}

// Create a mock database object for when database is not connected
const mockDb = new Proxy({}, {
  get: () => {
    throw new Error("Database is not available. Please check DATABASE_URL configuration.");
  }
});

export { pool };
export const database = db || mockDb;
export { isDbConnected };
