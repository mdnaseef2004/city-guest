import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Configure VAPID details
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@markaz.ac.in',
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Initialize Supabase with service key (bypasses RLS)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, title, body, isUrgent, url } = req.body;

  if (!userId || !title) {
    return res.status(400).json({ error: 'Missing required fields: userId and title' });
  }

  try {
    // Fetch all push subscriptions for the target user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase error fetching subscriptions:', error);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ message: 'No subscriptions found for user' });
    }

    // Notification payload
    const payload = JSON.stringify({
      title,
      body: body || '',
      isUrgent: isUrgent || false,
      url: url || '/',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
    });

    // Send push to all of the user's subscriptions (multiple devices)
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSub, payload);
          return { success: true, endpoint: sub.endpoint };
        } catch (err) {
          // If subscription is expired/invalid, remove it
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
            console.log('Removed stale subscription:', sub.endpoint);
          }
          throw err;
        }
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return res.status(200).json({ sent, failed });
  } catch (err) {
    console.error('Push notification error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
