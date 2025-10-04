import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 1. Check if `.env` file exists
const envPath = path.resolve(process.cwd(), '.env');

console.log('Looking for .env file at:', envPath);

if (fs.existsSync(envPath)) {
  console.log('.env file exists!');
} else {
  console.log('⚠️ .env file NOT FOUND at expected path');
}

// 2. Load it manually and see if it parses
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env:', result.error);
} else {
  console.log('✅ .env loaded successfully.');
  console.log('Parsed variables:', result.parsed);
}

// 3. Now try to access the variables
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);
console.log('DATABASE_URL:', process.env.DATABASE_URL);