import { configDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

configDotenv();

console.log('🔍 TTip Production Readiness Check\n');

const checks = [];

// 1. Environment Variables
console.log('1. Checking environment variables...');
const required = ['SUPABASE_URL', 'CONSUMER_KEY', 'CONSUMER_SECRET', 'SHORT_CODE', 'PASSKEY'];
const missing = required.filter(env => !process.env[env]);

checks.push({
    name: 'Environment Variables',
    passed: missing.length === 0,
    message: missing.length === 0 ? 'All required vars present' : `Missing: ${missing.join(', ')}`
});

// 2. Production URLs
console.log('2. Checking production URLs...');
const isProd = process.env.BASE_URL?.includes('api.safaricom.co.ke');
checks.push({
    name: 'Production M-Pesa URL',
    passed: isProd,
    message: isProd ? 'Using production M-Pesa API' : 'Still using sandbox - UPDATE FOR PRODUCTION'
});

// 3. Database Connection
console.log('3. Testing database connection...');
try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase.from('workers').select('count').limit(1);
    
    checks.push({
        name: 'Database Connection',
        passed: !error,
        message: error ? error.message : 'Connected successfully'
    });
} catch (error) {
    checks.push({
        name: 'Database Connection',
        passed: false,
        message: error.message
    });
}

// 4. Security Secrets
console.log('4. Checking security configuration...');
const hasSecrets = process.env.WEBHOOK_SECRET && process.env.JWT_SECRET;
checks.push({
    name: 'Security Secrets',
    passed: hasSecrets,
    message: hasSecrets ? 'Security secrets configured' : 'Missing WEBHOOK_SECRET or JWT_SECRET'
});

// 5. HTTPS Check
console.log('5. Checking HTTPS configuration...');
const hasHTTPS = process.env.BACKEND_URL?.startsWith('https://');
checks.push({
    name: 'HTTPS Configuration',
    passed: hasHTTPS,
    message: hasHTTPS ? 'HTTPS configured' : 'HTTPS required for production'
});

// Results
console.log('\n' + '='.repeat(50));
console.log('📊 PRODUCTION READINESS RESULTS');
console.log('='.repeat(50));

const passed = checks.filter(c => c.passed).length;
const total = checks.length;

checks.forEach(check => {
    const status = check.passed ? '✅' : '❌';
    console.log(`${status} ${check.name}: ${check.message}`);
});

console.log(`\n📈 Score: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);

if (passed === total) {
    console.log('\n🎉 READY FOR PRODUCTION!');
    console.log('Run: node deploy-production.js');
} else {
    console.log('\n⚠️  NOT READY FOR PRODUCTION');
    console.log('Fix the issues above before deploying');
}

console.log('\n🔧 Quick fixes:');
console.log('1. Update .env with production credentials');
console.log('2. Generate secrets: openssl rand -hex 32');
console.log('3. Setup HTTPS domain');
console.log('4. Get M-Pesa production API access');