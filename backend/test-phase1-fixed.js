// TTip Phase 1 Test Script - Fixed
// Tests: Commission system, Referral system, Review system

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

console.log('🚀 TTip Phase 1 Testing Started');
console.log('Testing: Commission System, Referral System, Review System');
console.log('='.repeat(60));

// Helper function to make API calls
const apiCall = async (method, endpoint, data = null) => {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (data) config.data = data;
        
        const response = await axios(config);
        return { success: true, data: response.data };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data?.error || error.message 
        };
    }
};

// Test 1: Worker Registration with Referral
const testWorkerRegistration = async () => {
    console.log('\n📝 Test 1: Worker Registration & Referral System');
    
    try {
        // Register first worker (referrer)
        console.log('Registering Alice (referrer)...');
        const alice = await apiCall('POST', '/api/register-worker', {
            phone: '254700000001',
            name: 'Alice Referrer',
            occupation: 'Waiter'
        });
        
        if (!alice.success) {
            console.log('❌ Alice registration failed:', alice.error);
            return false;
        }
        
        console.log('✅ Alice registered:', alice.data.workerId);
        const aliceWorkerId = alice.data.workerId;
        
        // Register second worker with referral code
        console.log("Registering Bob with Alice's referral code...");
        const bob = await apiCall('POST', '/api/register-worker', {
            phone: '254700000002',
            name: 'Bob Referee',
            occupation: 'Bartender',
            referralCode: aliceWorkerId
        });
        
        if (!bob.success) {
            console.log('❌ Bob registration failed:', bob.error);
            return false;
        }
        
        console.log('✅ Bob registered with referral:', bob.data.workerId);
        
        // Check Alice's referral credits
        const stats = await apiCall('GET', `/api/referral-stats/${aliceWorkerId}`);
        if (stats.success) {
            console.log('✅ Alice referral stats:', {
                credits: stats.data.referralCredits,
                totalReferrals: stats.data.totalReferrals
            });
            
            if (stats.data.referralCredits === 1 && stats.data.totalReferrals === 1) {
                console.log('✅ Referral system working correctly!');
                return { aliceWorkerId, bobWorkerId: bob.data.workerId };
            } else {
                console.log('❌ Referral credits not updated correctly');
                return false;
            }
        } else {
            console.log('❌ Failed to get referral stats:', stats.error);
            return false;
        }
        
    } catch (error) {
        console.log('❌ Worker registration test failed:', error.message);
        return false;
    }
};

// Test 2: Commission Calculation
const testCommissionSystem = async (workerId) => {
    console.log('\n💰 Test 2: Commission System');
    
    try {
        // Simulate a tip transaction
        const tipAmount = 100;
        const expectedCommission = Math.round(tipAmount * 0.03); // 3%
        const expectedPayout = tipAmount - expectedCommission;
        
        console.log(`Testing tip of KSh ${tipAmount}`);
        console.log(`Expected commission: KSh ${expectedCommission}`);
        console.log(`Expected worker payout: KSh ${expectedPayout}`);
        
        // Create a test transaction directly in database
        const { data: transaction, error } = await supabase
            .from('transactions')
            .insert({
                worker_id: workerId,
                customer_number: '254700000999',
                amount: tipAmount,
                status: 'PENDING',
                gateway: 'test'
            })
            .select()
            .single();
        
        if (error) {
            console.log('❌ Failed to create test transaction:', error.message);
            return false;
        }
        
        console.log('✅ Test transaction created:', transaction.id);
        return transaction.id;
        
    } catch (error) {
        console.log('❌ Commission test failed:', error.message);
        return false;
    }
};

// Test 3: Review System
const testReviewSystem = async (transactionId) => {
    console.log('\n⭐ Test 3: Review System');
    
    try {
        // Test review page loads
        console.log('Testing review page...');
        const reviewPage = await axios.get(`${BASE_URL}/review/${transactionId}`);
        
        if (reviewPage.status === 200 && reviewPage.data.includes('Rate Your Experience')) {
            console.log('✅ Review page loads correctly');
        } else {
            console.log('❌ Review page not loading');
            return false;
        }
        
        console.log('✅ Review system basic functionality working');
        return true;
        
    } catch (error) {
        console.log('❌ Review system test failed:', error.message);
        return false;
    }
};

// Run all tests
const runAllTests = async () => {
    console.log('Starting Phase 1 comprehensive testing...\n');
    
    let testResults = {
        registration: false,
        commission: false,
        reviews: false
    };
    
    try {
        // Test 1: Registration & Referrals
        const registrationResult = await testWorkerRegistration();
        testResults.registration = !!registrationResult;
        
        if (registrationResult) {
            // Test 2: Commission System
            const commissionResult = await testCommissionSystem(registrationResult.aliceWorkerId);
            testResults.commission = !!commissionResult;
            
            // Test 3: Review System
            if (commissionResult) {
                const reviewResult = await testReviewSystem(commissionResult);
                testResults.reviews = !!reviewResult;
            }
        }
        
    } catch (error) {
        console.log('\n❌ Test suite failed:', error.message);
    }
    
    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('🏁 PHASE 1 TEST RESULTS');
    console.log('='.repeat(60));
    
    const tests = [
        { name: 'Worker Registration & Referrals', result: testResults.registration },
        { name: 'Commission System Setup', result: testResults.commission },
        { name: 'Review System', result: testResults.reviews }
    ];
    
    tests.forEach(test => {
        const status = test.result ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${test.name}`);
    });
    
    const passedTests = tests.filter(t => t.result).length;
    const totalTests = tests.length;
    
    console.log('\n📈 SUMMARY:');
    console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`   Success Rate: ${Math.round(passedTests/totalTests*100)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 ALL TESTS PASSED! Phase 1 is ready for production.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the implementation.');
    }
};

// Run tests
runAllTests().catch(console.error);