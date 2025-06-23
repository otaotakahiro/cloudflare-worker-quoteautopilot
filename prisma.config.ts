import { fileURLToPath, URL } from 'node:url';
import type { PrismaConfig } from 'prisma';
import 'dotenv/config';

export default {
  earlyAccess: true,
  schema: fileURLToPath(new URL('./src/Infrastructure/Database/schema.prisma', import.meta.url)),
} satisfies PrismaConfig;
