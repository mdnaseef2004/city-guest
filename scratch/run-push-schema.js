import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';

const password = 'Nashi123@#7010298622';
const encodedPassword = encodeURIComponent(password);
const projectRef = 'btjagqphlsbhvwpqnlhn'; // from active .env file

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'ca-central-1',
  'sa-east-1'
];

async function tryConnection(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  return client;
}

async function run() {
  console.log('Reading schema_push.sql...');
  const schema = fs.readFileSync('supabase/schema_push.sql', 'utf8');

  for (const region of regions) {
    const port = 5432; // Transaction pooler or direct
    const host = `aws-0-${region}.pooler.supabase.com`;
    const conn = `postgresql://postgres.${projectRef}:${encodedPassword}@${host}:${port}/postgres`;
    
    console.log(`Trying to connect to: ${host} (Port ${port})...`);
    try {
      const client = await tryConnection(conn);
      console.log(`✅ Connected successfully to ${host}!`);

      console.log('Running SQL push schema...');
      await client.query(schema);
      console.log('✅✅✅ SUCCESS! Database table push_subscriptions and policies created!');
      await client.end();
      return;
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message.split('\n')[0]}`);
    }

    // Try port 6543 (Session pooler)
    const connSession = `postgresql://postgres.${projectRef}:${encodedPassword}@${host}:6543/postgres`;
    console.log(`Trying to connect to: ${host} (Port 6543)...`);
    try {
      const client = await tryConnection(connSession);
      console.log(`✅ Connected successfully to ${host} (6543)!`);

      console.log('Running SQL push schema...');
      await client.query(schema);
      console.log('✅✅✅ SUCCESS! Database table push_subscriptions and policies created!');
      await client.end();
      return;
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message.split('\n')[0]}`);
    }
  }

  console.log('\n❌ Could not connect to any database to run schema automatically.');
  console.log('Please copy the contents of supabase/schema_push.sql and run it manually in the Supabase SQL Editor.');
}

run();
