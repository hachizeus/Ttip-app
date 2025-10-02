import { createClient } from '@supabase/supabase-js';
import { generateQRCode } from './qr-service.js';
import { enqueuePayout } from './payment-queue.js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function runPhase1Tests() {
    console.log('🧪 Running TTip Phase 1 Tests...\n');
    
    let passed = 0;
    let failed = 0;
    
    // Test 1: Database Connection
    try {
        console.log('1️⃣ Testing database connection...');
        const { data, error } = await supabase.from('workers').select('count').single();
        if (error) throw error;
        console.log('✅ Database connection successful\n');
        passed++;
    } catch (error) {
        console.log('❌ Database connection failed:', error.message, '\n');
        failed++;
    }
    
    // Test 2: Worker Creation
    try {
        console.log('2️⃣ Testing worker creation...');
        const testWorker = {
            id: 'TEST001',
            name: 'Test Worker',
            phone: '+254700000001',
            occupation: 'Test Occupation'
        };
        
        const { error } = await supabase
            .from('workers')
            .upsert(testWorker);
        
        if (error) throw error;
        console.log('✅ Worker creation successful\n');
        passed++;
    } catch (error) {
        console.log('❌ Worker creation failed:', error.message, '\n');
        failed++;
    }
    
    // Test 3: QR Code Generation
    try {
        console.log('3️⃣ Testing QR code generation...');
        const qrData = await generateQRCode('TEST001');
        
        if (!qrData.qrPngUrl || !qrData.fallbackUrl) {
            throw new Error('QR data incomplete');
        }
        
        console.log('✅ QR code generation successful');
        console.log(`   PNG URL: ${qrData.qrPngUrl}`);
        console.log(`   Fallback URL: ${qrData.fallbackUrl}\n`);
        passed++;
    } catch (error) {
        console.log('❌ QR code generation failed:', error.message, '\n');
        failed++;
    }
    
    // Test 4: Transaction Creation
    try {
        console.log('4️⃣ Testing transaction creation...');
        const { data: transaction, error } = await supabase
            .from('transactions')
            .insert({
                worker_id: 'TEST001',
                customer_number: '+254700000002',
                amount: 100,
                status: 'PENDING'
            })
            .select()
            .single();
        
        if (error) throw error;
        console.log('✅ Transaction creation successful');
        console.log(`   Transaction ID: ${transaction.id}\n`);
        passed++;
        
        // Test 5: Payout Queue
        try {
            console.log('5️⃣ Testing payout queue...');
            const jobId = await enqueuePayout(
                transaction.id,
                'TEST001',
                100,
                '+254700000002'
            );
            
            console.log('✅ Payout queue test successful');
            console.log(`   Job ID: ${jobId}\n`);
            passed++;
        } catch (error) {
            console.log('❌ Payout queue test failed:', error.message, '\n');
            failed++;
        }
        
    } catch (error) {
        console.log('❌ Transaction creation failed:', error.message, '\n');
        failed++;
    }
    
    // Test 6: Environment Variables
    try {
        console.log('6️⃣ Testing environment variables...');
        const requiredEnvVars = [
            'SUPABASE_URL',
            'SUPABASE_SERVICE_KEY',
            'CONSUMER_KEY',
            'CONSUMER_SECRET',
            'SHORT_CODE',
            'PASSKEY'
        ];
        
        const missing = requiredEnvVars.filter(env => !process.env[env]);
        
        if (missing.length > 0) {
            throw new Error(`Missing environment variables: ${missing.join(', ')}`);
        }
        
        console.log('✅ All required environment variables present\n');
        passed++;
    } catch (error) {
        console.log('❌ Environment variables test failed:', error.message, '\n');
        failed++;
    }
    
    // Test 7: M-Pesa Credentials (Basic Auth Test)
    try {
        console.log('7️⃣ Testing M-Pesa credentials...');
        const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
        
        const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });
        
        const data = await response.json();
        
        if (!data.access_token) {
            throw new Error('Invalid M-Pesa credentials');
        }
        
        console.log('✅ M-Pesa credentials valid');
        console.log(`   Token preview: ${data.access_token.substring(0, 20)}...\n`);
        passed++;
    } catch (error) {
        console.log('❌ M-Pesa credentials test failed:', error.message, '\n');
        failed++;
    }
    
    // Cleanup test data
    try {
        console.log('🧹 Cleaning up test data...');
        await supabase.from('payouts').delete().eq('worker_id', 'TEST001');
        await supabase.from('transactions').delete().eq('worker_id', 'TEST001');
        await supabase.from('qr_codes').delete().eq('worker_id', 'TEST001');
        await supabase.from('workers').delete().eq('id', 'TEST001');
        console.log('✅ Cleanup completed\n');
    } catch (error) {
        console.log('⚠️ Cleanup warning:', error.message, '\n');
    }
    
    // Summary
    console.log('📊 Test Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 All tests passed! Phase 1 is ready for deployment.');
    } else {
        console.log('\n⚠️ Some tests failed. Please fix the issues before deployment.');
    }
    
    return { passed, failed };
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runPhase1Tests().catch(console.error);
}

export { runPhase1Tests };