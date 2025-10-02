#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

console.log('🚀 TTip Production Deployment Script\n');

// Check environment
const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY', 
    'CONSUMER_KEY',
    'CONSUMER_SECRET',
    'SHORT_CODE',
    'PASSKEY'
];

console.log('1. Checking environment variables...');
const missing = requiredEnvVars.filter(env => !process.env[env]);

if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(env => console.error(`   - ${env}`));
    console.error('\nPlease set these in your .env file');
    process.exit(1);
}
console.log('✅ All required environment variables present');

// Setup database
console.log('\n2. Setting up production database...');
try {
    execSync('node setup-phase3-db.js', { stdio: 'inherit' });
    console.log('✅ Database setup complete');
} catch (error) {
    console.error('❌ Database setup failed');
    process.exit(1);
}

// Generate admin user
console.log('\n3. Creating admin user...');
try {
    execSync('node generate-admin.js admin', { stdio: 'inherit' });
    console.log('✅ Admin user created');
} catch (error) {
    console.error('❌ Admin creation failed');
    process.exit(1);
}

// Install production dependencies
console.log('\n4. Installing production dependencies...');
try {
    execSync('npm install --production', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');
} catch (error) {
    console.error('❌ Dependency installation failed');
    process.exit(1);
}

// Health check
console.log('\n5. Running health check...');
try {
    execSync('node test-phase3-basic.js', { stdio: 'inherit' });
    console.log('✅ Health check passed');
} catch (error) {
    console.error('❌ Health check failed');
    process.exit(1);
}

console.log('\n🎉 PRODUCTION DEPLOYMENT COMPLETE!');
console.log('\nNext steps:');
console.log('1. Start server: npm start');
console.log('2. Test payments with small amounts');
console.log('3. Monitor logs and metrics');
console.log('4. Setup automated backups');

console.log('\n📊 Production URLs:');
console.log(`- Health: ${process.env.BACKEND_URL || 'https://your-domain.com'}/health`);
console.log(`- Admin: ${process.env.BACKEND_URL || 'https://your-domain.com'}/admin`);
console.log(`- Metrics: ${process.env.BACKEND_URL || 'https://your-domain.com'}/metrics`);