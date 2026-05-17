import { prisma } from './database.js'

console.log('Testing database connection...')

try {
    const result = await prisma.incident.findMany()
    console.log('✅ Database working! Incidents:', result.length)
} catch (e) {
    console.log('❌ Database error:', e.message)
}