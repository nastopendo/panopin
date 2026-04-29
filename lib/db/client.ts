import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Reuse connection in serverless (Next.js Route Handlers)
const globalForDb = globalThis as unknown as { _pgClient?: postgres.Sql };

const client =
  globalForDb._pgClient ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false,   // required for Supabase transaction pooler (pgBouncer)
    max: 3,           // small pool — prevents exhausting Supabase's connection limit in serverless
    connect_timeout: 10, // fail fast on cold starts instead of hanging for 60 s
    idle_timeout: 20,    // release idle connections quickly in short-lived functions
  });

if (process.env.NODE_ENV !== "production") globalForDb._pgClient = client;

export const db = drizzle(client, { schema });
