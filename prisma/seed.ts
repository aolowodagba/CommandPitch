// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'owner@commandpitch.com' },
    update: {},
    create: {
      name: 'Group Owner',
      email: 'owner@commandpitch.com',
    },
  })

  const group = await prisma.group.upsert({
    where: { slug: 'saturday-ballers' },
    update: {},
    create: {
      name: 'Saturday Ballers',
      slug: 'saturday-ballers',
      inviteCode: crypto.randomUUID(),
      visibility: 'PUBLIC',
      createdBy: user.id,
    },
  })

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: user.id } },
    update: {},
    create: {
      groupId: group.id,
      userId: user.id,
      role: 'owner',
    },
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
