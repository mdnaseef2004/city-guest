import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';

const password = 'Nashi123@#7010298622';
const encodedPassword = encodeURIComponent(password);
const projectRef = 'erzvvnxithgujrwgwadm';

const connections = [
  // Direct connection
  `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`,
  // Pooler - session mode (various regions)
  `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
];

async function tryConnection(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  return client;
}

async function run() {
  console.log('Reading schema.sql...');
  const schema = fs.readFileSync('supabase/schema.sql', 'utf8');

  for (const conn of connections) {
    const host = conn.split('@')[1].split('/')[0];
    console.log(`\nTrying: ${host}...`);
    try {
      const client = await tryConnection(conn);
      console.log(`✅ Connected to ${host}!`);

      console.log('Running schema...');
      await client.query(schema);
      console.log('');
      console.log('✅✅✅ SUCCESS! Database schema created!');
      console.log('✅ Tables, RLS policies, triggers and functions are all set up.');
      console.log('');
      console.log('You can now sign up at http://localhost:5173');
      await client.end();
      return;
    } catch (err) {
      console.log(`   ❌ ${err.message.split('\n')[0]}`);
    }
  }

  console.log('');
  console.log('❌ Could not connect automatically.');
  console.log('');
  console.log('MANUAL OPTION: Go to this URL and run the SQL file:');
  console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
}

run();
