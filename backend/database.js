import dotenv from "dotenv"
import path from "path"
import ws from "ws"
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

import { PrismaClient } from "./generated/prisma/client.js" 
import { PrismaNeon } from "@prisma/adapter-neon"
import { Pool, neonConfig } from "@neondatabase/serverless"

neonConfig.webSocketConstructor = ws

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaNeon(pool)

export const prisma = new PrismaClient({ adapter })