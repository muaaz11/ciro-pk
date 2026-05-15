import dotenv from 'dotenv';
dotenv.config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function runAgent() {
  // Agent logic will be implemented here
  console.log('CIRO AI Agent initialized.');
}

export { runAgent };
