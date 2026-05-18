import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config({ quiet: true });

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is missing. Add it to your .env file.');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.5';


