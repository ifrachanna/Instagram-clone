import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

let ai = null;

if (apiKey && apiKey !== 'your_gemini_api_key') {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error('[Gemini AI] Initialization error:', error.message);
  }
} else {
  console.warn('[Gemini AI] GEMINI_API_KEY is missing or unconfigured in .env. Moderation will operate in bypass mode.');
}

export default ai;
