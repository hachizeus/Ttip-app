import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const BASE_URL = 'http://localhost:3000';

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test 1: Create test worker
async function createTestWorker() {
    log('\n=== TEST 1: Creating Test Worker ===', 'blue');
    
    try {
        const { data, error } = await supabase
            .from('workers')
            .upsert([
                {
                    worker_id: 'TEST123',
                    name: 'John Test Worker',
                    occupation: 'Test Driver',
                    phone: '254708374149',
                    gender: 'male',
                    age: 30
                }
            ])
            .select();

        if (error) {
            log(`❌ Failed to create worker: ${error.message}`, 'red');
            return false;
        }
        
        log(`✅ Test worker created: ${data[0].name}`, 'green');
        return true;
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        return false;
    }
}

// Test 2: Test payment initiation
async function testPaymentInitiation() {
    log('\n=== TEST 2: Testing Payment Initiation ===', 'blue');
    
    try {
        const paymentData = {
            workerId: 'TEST123',
            amount: 10,
            customerPhone: '254708374149'
        };
        
        const response = await axios.post(`${BASE_URL}/api/stk-push`, paymentData);
        
        if (response.data.success) {
            log('✅ Payment initiated successfully', 'green');
            log(`   CheckoutRequestID: ${response.data.checkoutRequestId}`, 'yellow');
            return response.data.checkoutRequestId;
        } else {
            log(`❌ Payment failed: ${response.data.error}`, 'red');
            return null;
        }
    } catch (error) {
        log(`❌ Payment initiation error: ${error.message}`, 'red');
        return null;
    }
}

// Test 3: Check database storage
async function testDatabaseStorage() {
    log('\n=== TEST 3: Testing Database Storage ===', 'blue');
    
    try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) {
            log(`❌ Database query error: ${error.message}`, 'red');
            return false;
        }
        
        if (transactions && transactions.length > 0) {
            const transaction = transactions[0];
            log('✅ Recent transactions found in database', 'green');
            log(`   Latest: ${transaction.worker_id} - KSh ${transaction.amount} - ${transaction.status}`, 'yellow');
            return transaction;
        } else {
            log('❌ No transactions found in database', 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Database check error: ${error.message}`, 'red');
        return false;
    }
}

// Test 4: Test transactions endpoint
async function testTransactionsEndpoint() {
    log('\n=== TEST 4: Testing Transactions Endpoint ===', 'blue');
    
    try {
        const response = await axios.get(`${BASE_URL}/api/transactions`);
        
        if (response.data.transactions && response.data.transactions.length > 0) {
            log(`✅ Transactions endpoint working: ${response.data.transactions.length} transactions found`, 'green');
            
            const latest = response.data.transactions[0];
            log(`   Latest: ${latest.worker_id} - KSh ${latest.amount} - ${latest.status}`, 'yellow');
            return true;
        } else {
            log('❌ No transactions found via API', 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Transactions endpoint error: ${error.message}`, 'red');
        return false;
    }
}

// Test 5: Test tip page
async function testTipPage() {
    log('\n=== TEST 5: Testing Tip Page ===', 'blue');
    
    try {
        const response = await axios.get(`${BASE_URL}/pay/TEST123`);
        
        if (response.status === 200 && response.data.includes('John Test Worker')) {
            log('✅ Tip page loads correctly with worker info', 'green');
            return true;
        } else {
            log('❌ Tip page did not load correctly', 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Failed to load tip page: ${error.message}`, 'red');
        return false;
    }
}

// Test 6: Test callback simulation
async function testCallbackSimulation() {
    log('\n=== TEST 6: Testing Callback Simulation ===', 'blue');
    
    try {
        // Get a recent transaction
        const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (!transactions || transactions.length === 0) {
            log('❌ No pending transactions to test callback', 'red');
            return false;
        }
        
        const transaction = transactions[0];
        const checkoutRequestID = transaction.raw_payload?.CheckoutRequestID;
        
        if (!checkoutRequestID) {
            log('❌ No CheckoutRequestID found in transaction', 'red');
            return false;
        }
        
        const callbackData = {
            Body: {
                stkCallback: {
                    CheckoutRequestID: checkoutRequestID,
                    ResultCode: 0,
                    ResultDesc: 'The service request is processed successfully.',
                    MpesaReceiptNumber: 'TEST' + Date.now()
                }
            }
        };
        
        const response = await axios.post(`${BASE_URL}/mpesa/c2b-callback`, callbackData);
        
        if (response.status === 200) {
            log('✅ Callback processed successfully', 'green');
            
            // Check if database was updated
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { data: updatedTransaction } = await supabase
                .from('transactions')
                .select('*')
                .eq('id', transaction.id)
                .single();
            
            if (updatedTransaction && updatedTransaction.status === 'COMPLETED') {
                log('✅ Database updated with callback data', 'green');
                log(`   Status: ${updatedTransaction.status}`, 'yellow');
                return true;
            } else {
                log('❌ Database not updated after callback', 'red');
                return false;
            }
        } else {
            log('❌ Callback processing failed', 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Callback test error: ${error.message}`, 'red');
        return false;
    }
}

// Main test runner
async function runAllTests() {
    log('🚀 Starting TTip Functionality Tests', 'blue');
    log('Testing your Phase 3 server on http://localhost:3000\n', 'yellow');
    
    const results = [];
    
    // Run all tests
    results.push(await createTestWorker());
    results.push(await testTipPage());
    
    const checkoutRequestID = await testPaymentInitiation();
    results.push(checkoutRequestID !== null);
    
    results.push(await testDatabaseStorage());
    results.push(await testTransactionsEndpoint());
    results.push(await testCallbackSimulation());
    
    // Summary
    const passed = results.filter(r => r === true).length;
    const total = results.length;
    
    log('\n=== TEST SUMMARY ===', 'blue');
    log(`Passed: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
    
    if (passed === total) {
        log('🎉 All tests passed! Your TTip system is working correctly.', 'green');
        log('\nYou can now:', 'blue');
        log(`• Visit: ${BASE_URL}/pay/TEST123`, 'yellow');
        log(`• Check dashboard: ${BASE_URL}/analytics-dashboard.html`, 'yellow');
        log(`• View transactions: ${BASE_URL}/api/transactions`, 'yellow');
        log('• Deploy to production with confidence!', 'yellow');
    } else {
        log('❌ Some tests failed. Check the errors above.', 'red');
        log('Your server is running but some functionality needs attention.', 'yellow');
    }
}

// Run tests
runAllTests().catch(console.error);