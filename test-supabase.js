import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env manually
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) env[key.trim()] = value.join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing Supabase Connection to:', supabaseUrl);
  
  // 1. Check if 'profiles' table exists
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(1);
  if (pErr) {
    console.error('❌ Error querying profiles table. Did you run the SQL schema?');
    console.error(pErr.message);
  } else {
    console.log('✅ Profiles table exists.');
  }

  // 2. Check if 'guests' table exists
  const { data: guests, error: gErr } = await supabase.from('guests').select('*').limit(1);
  if (gErr) {
    console.error('❌ Error querying guests table.');
    console.error(gErr.message);
  } else {
    console.log('✅ Guests table exists.');
  }
}

test();
