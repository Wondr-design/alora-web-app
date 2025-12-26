import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"

import * as schema from "./schema"

interface DatabaseState {
  client: postgres.Sql
  db: ReturnType<typeof drizzle>
}

const globalForDb = globalThis as { __db?: DatabaseState }

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is required")
  return url
}

function createDatabaseState(): DatabaseState {
  const client = postgres(getDatabaseUrl(), { max: 1 })
  const db = drizzle(client, { schema })
  return { client, db }
}

export function getDb() {
  if (!globalForDb.__db) globalForDb.__db = createDatabaseState()
  return globalForDb.__db.db
}
