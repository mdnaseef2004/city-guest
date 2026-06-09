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
const supabaseServiceKey = env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Creating push_subscriptions table via Supabase REST...\n');

  const steps = [
    {
      name: 'Create push_subscriptions table',
      sql: `
        create table if not exists public.push_subscriptions (
          id uuid default uuid_generate_v4() primary key,
          user_id uuid references public.profiles(id) on delete cascade not null,
          endpoint text not null,
          p256dh text not null,
          auth text not null,
          created_at timestamptz default now(),
          constraint unique_user_endpoint unique(user_id, endpoint)
        );
      `
    },
    {
      name: 'Enable RLS',
      sql: `alter table public.push_subscriptions enable row level security;`
    },
    {
      name: 'Drop old policies (if any)',
      sql: `
        drop policy if exists "Users can view own subscriptions" on public.push_subscriptions;
        drop policy if exists "Users can insert own subscriptions" on public.push_subscriptions;
        drop policy if exists "Users can delete own subscriptions" on public.push_subscriptions;
      `
    },
    {
      name: 'Create SELECT policy',
      sql: `
        create policy "Users can view own subscriptions" on public.push_subscriptions
          for select using (user_id = auth.uid());
      `
    },
    {
      name: 'Create INSERT policy',
      sql: `
        create policy "Users can insert own subscriptions" on public.push_subscriptions
          for insert with check (user_id = auth.uid());
      `
    },
    {
      name: 'Create DELETE policy',
      sql: `
        create policy "Users can delete own subscriptions" on public.push_subscriptions
          for delete using (user_id = auth.uid());
      `
    },
  ];

  for (const step of steps) {
    process.stdout.write(`Running: ${step.name}... `);
    const { error } = await supabase.rpc('exec_sql', { sql: step.sql }).catch(() => ({ error: { message: 'RPC not available' } }));
    
    if (error) {
      // Try direct fetch to REST SQL endpoint
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql: step.sql })
      });
      
      if (!res.ok) {
        console.log(`❌ Failed (${res.status}): ${await res.text()}`);
      } else {
        console.log('✅');
      }
    } else {
      console.log('✅');
    }
  }

  console.log('\nDone! Check Supabase dashboard to confirm table was created.');
}

run();
