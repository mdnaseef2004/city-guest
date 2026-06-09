import crypto from 'crypto';

// Generate elliptic curve (P-256) key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1'
});

// Export keys in URL-safe Base64 format
const vapidPublicKey = publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');
const vapidPrivateKey = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64url');

console.log('--- VAPID KEYS GENERATED ---');
console.log('Public Key (VITE_VAPID_PUBLIC_KEY):');
console.log(vapidPublicKey);
console.log('\nPrivate Key (VAPID_PRIVATE_KEY):');
console.log(vapidPrivateKey);
console.log('---------------------------');
