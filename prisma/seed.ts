import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
})

async function main() {
  const {
    SUPERUSER_EMAIL,
    SUPERUSER_USERNAME,
    SUPERUSER_PASSWORD,
    SUPERUSER_FULLNAME,
    SUPERUSER_PHONE,
  } = process.env

  if (
    !SUPERUSER_EMAIL ||
    !SUPERUSER_USERNAME ||
    !SUPERUSER_PASSWORD ||
    !SUPERUSER_FULLNAME ||
    !SUPERUSER_PHONE
  ) {
    throw new Error('Missing SUPERUSER env variables')
  }

  const hashedPassword = await bcrypt.hash(SUPERUSER_PASSWORD, 12)

  await prisma.user.upsert({
    where: { email: SUPERUSER_EMAIL },
    update: {},
    create: {
      email: SUPERUSER_EMAIL,
      username: SUPERUSER_USERNAME,
      password: hashedPassword,
      fullname: SUPERUSER_FULLNAME,
      phone_number: SUPERUSER_PHONE,
      role: 'SUPERUSER',
    },
  })

  console.log('✅ Superuser seeded successfully')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })