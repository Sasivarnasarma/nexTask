import webpush from 'web-push';

function generate() {
  const keys = webpush.generateVAPIDKeys();

  // Convert URL-safe base64 keys to standard base64 (replacing - with +, _ with /)
  // and restoring padding if necessary, or just convert them via buffer.
  const pubBuffer = Buffer.from(keys.publicKey, 'base64');
  const privBuffer = Buffer.from(keys.privateKey, 'base64');

  const standardPubKeyBase64 = pubBuffer.toString('base64');
  const standardPrivKeyBase64 = privBuffer.toString('base64');

  console.log('🔑 Generated VAPID Keys (Standard Base64 format for .env):');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`VAPID_PUBLIC_KEY="${standardPubKeyBase64}"`);
  console.log(`VAPID_PRIVATE_KEY="${standardPrivKeyBase64}"`);
  console.log('VAPID_SUBJECT="mailto:admin@nextask.com"');
  console.log('──────────────────────────────────────────────────────────────');
  console.log("\n💡 Add these variables to your server's .env file.");
}

generate();
