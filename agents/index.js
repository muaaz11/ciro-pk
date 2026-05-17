import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.ANTHROPIC_API_KEY);

async function runAgent() {
  console.log('CIRO AI Agent initialized.');
}

export { runAgent };
