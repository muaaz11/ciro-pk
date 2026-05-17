// import ws from "ws"
// import { PrismaClient } from "./generated/prisma/client.js"
// import { PrismaNeon } from "@prisma/adapter-neon"
// import { Pool, neonConfig } from "@neondatabase/serverless"

// neonConfig.webSocketConstructor = ws

// const pool = new Pool({
//   connectionString: "postgresql://neondb_owner:npg_UgtW8DBo2Zqe@ep-purple-glade-ao3x4atd-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
// })

// const adapter = new PrismaNeon(pool)
// export const prisma = new PrismaClient({ adapter })

import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_UgtW8DBo2Zqe@ep-purple-glade-ao3x4atd-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require",
  ssl: { rejectUnauthorized: false }
})

export { pool }