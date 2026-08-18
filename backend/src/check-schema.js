import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const rooms = await prisma.$queryRaw`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'Room';`;
    console.log(rooms);
}
main().catch(console.error).finally(() => prisma.$disconnect());
