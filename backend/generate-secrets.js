import crypto from 'crypto';

console.log('🔐 Generating Production Security Secrets\n');

const webhookSecret = crypto.randomBytes(32).toString('hex');
const jwtSecret = crypto.randomBytes(32).toString('hex');
const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log('Copy these to your .env file:\n');
console.log(`WEBHOOK_SECRET=${webhookSecret}`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`ENCRYPTION_KEY=${encryptionKey}`);

console.log('\n✅ Secrets generated successfully!');
console.log('⚠️  Store these securely - they cannot be recovered if lost.');