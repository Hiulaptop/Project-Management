// lib/db.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const globalForPrisma = globalThis as unknown as {
  pool?: Pool
  prisma?: PrismaClient
} 

declare global {
  interface BigInt {
    toJSON(): number;
  }
}

BigInt.prototype.toJSON = function() {
  return Number(this);
}

function createPool(): Pool {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
  })
  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err)
  })
  return pool
}

const pool = globalForPrisma.pool ?? createPool()
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
  })

globalForPrisma.pool = pool
globalForPrisma.prisma = prisma

export default prisma