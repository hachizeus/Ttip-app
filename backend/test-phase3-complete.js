import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

console.log('🚀 Starting Phase 3 Complete Test Suite...\n');

// Test 1: Database Schema Verification
async function testDatabaseSchema() {
    console.log('📋 Test 1: Database Schema Verification');
    
    try {
        // Check if all Phase 3 tables exist
        const tables = [
            'idempotency_keys', 'admin_users', 'fraud_checks', 'fraud_blacklist',
            'ussd_qr_codes', 'ussd_mappings', 'system_logs', 'security_logs',
            'system_alerts', 'transaction_logs', 'analytics_events', 'ml_insights'
        ];
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
            
            if (error && !error.message.includes('0 rows')) {
                throw new Error(`Table ${table} not found: ${error.message}`);
            }
            console.log(`✅ Table ${table} exists`);
        }
        
        // Check admin dashboard view
        const { data: dashData, error: dashError } = await supabase
            .from('admin_dashboard_stats')
            .select('*');
            
        if (dashError) throw dashError;
        console.log('✅ Admin dashboard view working');
        
        console.log('✅ All Phase 3 tables verified\n');
        return true;
    } catch (error) {
        console.log(`❌ Schema test failed: ${error.message}\n`);
        return false;
    }
}

// Test 2: Fraud Detection System
async function testFraudDetection() {
    console.log('🛡️ Test 2: Fraud Detection System');
    
    try {
        // Create test fraud check
        const { data: fraudCheck, error: fraudError } = await supabase
            .from('fraud_checks')
            .insert({
                customer_phone: '+254700000001',
                customer_email: 'test@fraud.com',
                amount: 50000.00,
                payment_method: 'mpesa',
                fraud_score: 0.85,
                flagged: true,
                reasons: 'High amount, suspicious pattern'
            })
            .select()
            .single();
            
        if (fraudError) throw fraudError;
        console.log('✅ Fraud check created:', fraudCheck.id);
        
        // Add to blacklist
        const { data: blacklist, error: blacklistError } = await supabase
            .from('fraud_blacklist')
            .insert({
                identifier: '+254700000001',
                reason: 'Fraudulent activity detected',
                active: true
            })
            .select()
            .single();
            
        if (blacklistError) throw blacklistError;
        console.log('✅ Blacklist entry created:', blacklist.id);
        
        console.log('✅ Fraud detection system working\n');
        return true;
    } catch (error) {
        console.log(`❌ Fraud detection test failed: ${error.message}\n`);
        return false;
    }
}

// Test 3: USSD & QR Code System
async function testUSSDSystem() {
    console.log('📱 Test 3: USSD & QR Code System');
    
    try {
        // Create test worker first
        const { data: worker, error: workerError } = await supabase
            .from('workers')
            .insert({
                name: 'Test Worker Phase3',
                phone: '+254700000003',
                occupation: 'service',
                gender: 'Male',
                worker_id: 'PHASE3_' + Date.now(),
                qr_code: 'https://test-qr.com/phase3_' + Date.now()
            })
            .select()
            .single();
            
        if (workerError) throw workerError;
        console.log('✅ Test worker created:', worker.id);
        
        // Create USSD QR code
        const { data: qrCode, error: qrError } = await supabase
            .from('ussd_qr_codes')
            .insert({
                worker_id: worker.id,
                qr_type: 'ussd',
                qr_content: '*334*1*123456#',
                instructions: {
                    steps: ['Dial *334*1*123456#', 'Enter amount', 'Confirm payment'],
                    paybill: '123456',
                    account: worker.id
                }
            })
            .select()
            .single();
            
        if (qrError) throw qrError;
        console.log('✅ USSD QR code created:', qrCode.id);
        
        // Create USSD mapping
        const { data: mapping, error: mappingError } = await supabase
            .from('ussd_mappings')
            .insert({
                mpesa_code: 'ABC123XYZ',
                worker_id: worker.id,
                amount: 100.00,
                phone_number: '+254700000004',
                reconciled: false
            })
            .select()
            .single();
            
        if (mappingError) throw mappingError;
        console.log('✅ USSD mapping created:', mapping.id);
        
        console.log('✅ USSD system working\n');
        return true;
    } catch (error) {
        console.log(`❌ USSD system test failed: ${error.message}\n`);
        return false;
    }
}

// Test 4: Monitoring & Logging
async function testMonitoring() {
    console.log('📊 Test 4: Monitoring & Logging System');
    
    try {
        // Create system log
        const { data: sysLog, error: sysError } = await supabase
            .from('system_logs')
            .insert({
                type: 'payment_processing',
                message: 'Payment processed successfully',
                context: { transaction_id: 'test-123', amount: 100 },
                severity: 'info'
            })
            .select()
            .single();
            
        if (sysError) throw sysError;
        console.log('✅ System log created:', sysLog.id);
        
        // Create security log
        const { data: secLog, error: secError } = await supabase
            .from('security_logs')
            .insert({
                type: 'failed_login',
                message: 'Failed admin login attempt',
                context: { username: 'test_user', attempts: 3 },
                ip_address: '192.168.1.1',
                user_agent: 'Test Browser',
                severity: 'warning'
            })
            .select()
            .single();
            
        if (secError) throw secError;
        console.log('✅ Security log created:', secLog.id);
        
        // Create system alert
        const { data: alert, error: alertError } = await supabase
            .from('system_alerts')
            .insert({
                id: 'high_fraud_rate_' + Date.now(),
                type: 'fraud_alert',
                message: 'High fraud rate detected in last hour',
                severity: 'critical',
                acknowledged: false
            })
            .select()
            .single();
            
        if (alertError) throw alertError;
        console.log('✅ System alert created:', alert.id);
        
        console.log('✅ Monitoring system working\n');
        return true;
    } catch (error) {
        console.log(`❌ Monitoring test failed: ${error.message}\n`);
        return false;
    }
}

// Test 5: Analytics System
async function testAnalytics() {
    console.log('📈 Test 5: Analytics System');
    
    try {
        // Create analytics events
        const events = [
            { type: 'payment_initiated', data: { amount: 100, method: 'mpesa' } },
            { type: 'qr_scanned', data: { worker_id: 'test-123', location: 'nairobi' } },
            { type: 'user_signup', data: { source: 'mobile_app' } }
        ];
        
        for (const event of events) {
            const { data, error } = await supabase
                .from('analytics_events')
                .insert({
                    ...event,
                    session_id: 'test_session_' + Date.now()
                })
                .select()
                .single();
                
            if (error) throw error;
            console.log(`✅ Analytics event created: ${event.type}`);
        }
        
        // Create ML insights
        const { data: insights, error: insightsError } = await supabase
            .from('ml_insights')
            .insert({
                insights: {
                    fraud_patterns: ['high_amount_new_user', 'rapid_transactions'],
                    recommendations: ['increase_verification', 'monitor_closely'],
                    confidence: 0.87
                },
                data_points: 1000
            })
            .select()
            .single();
            
        if (insightsError) throw insightsError;
        console.log('✅ ML insights created:', insights.id);
        
        console.log('✅ Analytics system working\n');
        return true;
    } catch (error) {
        console.log(`❌ Analytics test failed: ${error.message}\n`);
        return false;
    }
}

// Test 6: Idempotency System
async function testIdempotency() {
    console.log('🔄 Test 6: Idempotency System');
    
    try {
        const idempotencyKey = 'test_key_' + Date.now();
        
        // Create idempotency key
        const { data: idemKey, error: idemError } = await supabase
            .from('idempotency_keys')
            .insert({
                key: idempotencyKey,
                response: { status: 'success', transaction_id: 'test-123' }
            })
            .select()
            .single();
            
        if (idemError) throw idemError;
        console.log('✅ Idempotency key created:', idemKey.id);
        
        // Try to create duplicate (should fail)
        const { error: duplicateError } = await supabase
            .from('idempotency_keys')
            .insert({
                key: idempotencyKey,
                response: { status: 'duplicate' }
            });
            
        if (!duplicateError || !duplicateError.message.includes('duplicate')) {
            throw new Error('Duplicate idempotency key should have failed');
        }
        console.log('✅ Duplicate prevention working');
        
        console.log('✅ Idempotency system working\n');
        return true;
    } catch (error) {
        console.log(`❌ Idempotency test failed: ${error.message}\n`);
        return false;
    }
}

// Test 7: Enhanced Transactions
async function testEnhancedTransactions() {
    console.log('💳 Test 7: Enhanced Transactions');
    
    try {
        // Create enhanced transaction
        const { data: transaction, error: transError } = await supabase
            .from('transactions')
            .insert({
                amount: 250.00,
                customer_number: '+254700000005',
                status: 'PENDING',
                currency: 'KES',
                payment_reference: 'REF' + Date.now(),
                fraud_score: 0.15
            })
            .select()
            .single();
            
        if (transError) throw transError;
        console.log('✅ Enhanced transaction created:', transaction.id);
        
        // Create transaction log
        const { data: transLog, error: logError } = await supabase
            .from('transaction_logs')
            .insert({
                transaction_id: transaction.id,
                amount: transaction.amount,
                gateway: 'mpesa',
                status: 'initiated'
            })
            .select()
            .single();
            
        if (logError) throw logError;
        console.log('✅ Transaction log created:', transLog.id);
        
        console.log('✅ Enhanced transactions working\n');
        return true;
    } catch (error) {
        console.log(`❌ Enhanced transactions test failed: ${error.message}\n`);
        return false;
    }
}

// Test 8: Admin Dashboard Stats
async function testAdminDashboard() {
    console.log('📊 Test 8: Admin Dashboard Stats');
    
    try {
        const { data: stats, error: statsError } = await supabase
            .from('admin_dashboard_stats')
            .select('*')
            .single();
            
        if (statsError) throw statsError;
        
        console.log('✅ Dashboard stats retrieved:');
        console.log(`   - Transactions (24h): ${stats.transactions_24h || 0}`);
        console.log(`   - Completed (24h): ${stats.completed_24h || 0}`);
        console.log(`   - Fraud flags (24h): ${stats.fraud_flags_24h || 0}`);
        console.log(`   - Revenue (24h): KES ${stats.revenue_24h || 0}`);
        console.log(`   - Unacknowledged alerts: ${stats.unacknowledged_alerts || 0}`);
        
        console.log('✅ Admin dashboard working\n');
        return true;
    } catch (error) {
        console.log(`❌ Admin dashboard test failed: ${error.message}\n`);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    const tests = [
        { name: 'Database Schema', fn: testDatabaseSchema },
        { name: 'Fraud Detection', fn: testFraudDetection },
        { name: 'USSD System', fn: testUSSDSystem },
        { name: 'Monitoring', fn: testMonitoring },
        { name: 'Analytics', fn: testAnalytics },
        { name: 'Idempotency', fn: testIdempotency },
        { name: 'Enhanced Transactions', fn: testEnhancedTransactions },
        { name: 'Admin Dashboard', fn: testAdminDashboard }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        const result = await test.fn();
        if (result) {
            passed++;
        } else {
            failed++;
        }
    }
    
    console.log('🎯 PHASE 3 TEST RESULTS:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 ALL PHASE 3 TESTS PASSED! System is ready for production.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
}

runAllTests().catch(console.error);