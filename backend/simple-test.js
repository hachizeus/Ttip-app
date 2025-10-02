import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const BASE_URL = 'http://localhost:3000';

console.log('🚀 Testing TTip Server...\n');

// Test 1: Check if server is running
async function testServerStatus() {
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Server is running:', response.data.status);
        return true;
    } catch (error) {
        console.log('❌ Server not responding');
        return false;
    }
}

// Test 2: Check existing workers
async function checkWorkers() {
    try {
        const { data: workers, error } = await supabase
            .from('workers')
            .select('worker_id, name, occupation')
            .limit(5);
        
        if (error) {
            console.log('❌ Database error:', error.message);
            return false;
        }
        
        console.log(`✅ Found ${workers.length} workers in database:`);
        workers.forEach(w => console.log(`   - ${w.worker_id}: ${w.name} (${w.occupation})`));
        return workers.length > 0 ? workers[0].worker_id : null;
    } catch (error) {
        console.log('❌ Worker check failed:', error.message);
        return false;
    }
}

// Test 3: Test tip page with existing worker
async function testTipPage(workerId) {
    if (!workerId) {
        console.log('❌ No worker ID to test');
        return false;
    }
    
    try {
        const response = await axios.get(`${BASE_URL}/pay/${workerId}`);
        
        if (response.status === 200) {
            console.log(`✅ Tip page loads for worker: ${workerId}`);
            return true;
        }
    } catch (error) {
        console.log(`❌ Tip page failed for ${workerId}:`, error.response?.status || error.message);
        return false;
    }
}

// Test 4: Check recent transactions
async function checkTransactions() {
    try {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3);
        
        if (error) {
            console.log('❌ Transaction query error:', error.message);
            return false;
        }
        
        console.log(`✅ Found ${transactions.length} recent transactions:`);
        transactions.forEach(tx => {
            console.log(`   - ${tx.worker_id}: KSh ${tx.amount} (${tx.status}) - ${new Date(tx.created_at).toLocaleString()}`);
        });
        return true;
    } catch (error) {
        console.log('❌ Transaction check failed:', error.message);
        return false;
    }
}

// Test 5: Test payment with existing worker
async function testPayment(workerId) {
    if (!workerId) {
        console.log('❌ No worker ID to test payment');
        return false;
    }
    
    try {
        const paymentData = {
            workerId: workerId,
            amount: 5,
            customerPhone: '254708374149'
        };
        
        const response = await axios.post(`${BASE_URL}/api/stk-push`, paymentData);
        
        if (response.data.success) {
            console.log('✅ Payment test successful:', response.data.checkoutRequestId);
            return response.data.checkoutRequestId;
        } else {
            console.log('❌ Payment failed:', response.data.error);
            return false;
        }
    } catch (error) {
        console.log('❌ Payment test error:', error.response?.data?.error || error.message);
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('=== TTip Server Test Results ===\n');
    
    const serverOk = await testServerStatus();
    if (!serverOk) return;
    
    const workerId = await checkWorkers();
    await testTipPage(workerId);
    await checkTransactions();
    
    console.log('\n=== Payment Test ===');
    const paymentResult = await testPayment(workerId);
    
    if (paymentResult) {
        console.log('\n✅ Your TTip system is working!');
        console.log(`\n🔗 Test URLs:`);
        console.log(`   • Tip page: ${BASE_URL}/pay/${workerId}`);
        console.log(`   • Dashboard: ${BASE_URL}/analytics-dashboard.html`);
        console.log(`   • Marketplace: ${BASE_URL}/marketplace-dashboard.html`);
    } else {
        console.log('\n⚠️  Basic functionality works, but payment needs attention');
    }
}

runTests().catch(console.error);