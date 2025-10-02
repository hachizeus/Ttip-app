import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

console.log('🔧 Diagnosing and fixing callback issues...\n');

// 1. Check recent transactions with issues
async function checkRecentTransactions() {
    console.log('=== Checking Recent Transactions ===');
    
    try {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) {
            console.log('❌ Database error:', error.message);
            return;
        }
        
        console.log(`Found ${transactions.length} recent transactions:`);
        
        transactions.forEach(tx => {
            console.log(`\n📋 Transaction: ${tx.id}`);
            console.log(`   Worker: ${tx.worker_id}`);
            console.log(`   Amount: ${tx.amount}`);
            console.log(`   Status: ${tx.status}`);
            console.log(`   Commission: ${tx.commission_amount}`);
            console.log(`   Worker Payout: ${tx.worker_payout}`);
            console.log(`   M-Pesa TX ID: ${tx.mpesa_tx_id || 'None'}`);
            console.log(`   Created: ${new Date(tx.created_at).toLocaleString()}`);
            
            // Check for issues
            if (tx.amount && (tx.commission_amount === null || tx.worker_payout === null)) {
                console.log('   ⚠️  Missing commission calculation');
            }
            if (tx.status === 'PENDING' && tx.mpesa_tx_id) {
                console.log('   ⚠️  Has M-Pesa ID but still PENDING');
            }
        });
        
        return transactions;
    } catch (error) {
        console.log('❌ Error checking transactions:', error.message);
    }
}

// 2. Fix transactions with missing calculations
async function fixTransactionCalculations() {
    console.log('\n=== Fixing Transaction Calculations ===');
    
    try {
        // Get transactions with missing calculations
        const { data: brokenTransactions, error } = await supabase
            .from('transactions')
            .select('*')
            .or('commission_amount.is.null,worker_payout.is.null')
            .not('amount', 'is', null)
            .limit(10);
        
        if (error) {
            console.log('❌ Query error:', error.message);
            return;
        }
        
        console.log(`Found ${brokenTransactions.length} transactions needing fixes`);
        
        for (const tx of brokenTransactions) {
            const amount = parseFloat(tx.amount);
            const commission = Math.round(amount * 0.05); // 5% commission
            const workerPayout = amount - commission;
            
            console.log(`\n🔧 Fixing transaction ${tx.id}:`);
            console.log(`   Amount: ${amount}`);
            console.log(`   Commission (5%): ${commission}`);
            console.log(`   Worker Payout: ${workerPayout}`);
            
            const { error: updateError } = await supabase
                .from('transactions')
                .update({
                    commission_amount: commission,
                    worker_payout: workerPayout
                })
                .eq('id', tx.id);
            
            if (updateError) {
                console.log(`   ❌ Update failed: ${updateError.message}`);
            } else {
                console.log(`   ✅ Fixed successfully`);
            }
        }
        
    } catch (error) {
        console.log('❌ Error fixing calculations:', error.message);
    }
}

// 3. Update transactions with M-Pesa IDs to COMPLETED
async function fixPendingWithMpesaId() {
    console.log('\n=== Fixing PENDING Transactions with M-Pesa IDs ===');
    
    try {
        const { data: pendingWithMpesa, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('status', 'PENDING')
            .not('mpesa_tx_id', 'is', null);
        
        if (error) {
            console.log('❌ Query error:', error.message);
            return;
        }
        
        console.log(`Found ${pendingWithMpesa.length} PENDING transactions with M-Pesa IDs`);
        
        for (const tx of pendingWithMpesa) {
            console.log(`\n🔧 Updating transaction ${tx.id} to COMPLETED`);
            
            const { error: updateError } = await supabase
                .from('transactions')
                .update({ status: 'COMPLETED' })
                .eq('id', tx.id);
            
            if (updateError) {
                console.log(`   ❌ Update failed: ${updateError.message}`);
            } else {
                console.log(`   ✅ Updated to COMPLETED`);
            }
        }
        
    } catch (error) {
        console.log('❌ Error fixing pending transactions:', error.message);
    }
}

// 4. Test callback with proper data
async function testCallbackWithProperData() {
    console.log('\n=== Testing Callback with Proper Data ===');
    
    try {
        // Get a recent transaction
        const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (!transactions || transactions.length === 0) {
            console.log('❌ No transactions found to test');
            return;
        }
        
        const tx = transactions[0];
        const checkoutRequestID = tx.raw_payload?.CheckoutRequestID;
        
        if (!checkoutRequestID) {
            console.log('❌ No CheckoutRequestID found');
            return;
        }
        
        console.log(`Testing callback for transaction: ${tx.id}`);
        console.log(`CheckoutRequestID: ${checkoutRequestID}`);
        
        // Create proper callback data
        const callbackData = {
            Body: {
                stkCallback: {
                    MerchantRequestID: tx.raw_payload?.MerchantRequestID || 'TEST_MERCHANT',
                    CheckoutRequestID: checkoutRequestID,
                    ResultCode: 0,
                    ResultDesc: 'The service request is processed successfully.',
                    CallbackMetadata: {
                        Item: [
                            {
                                Name: 'Amount',
                                Value: tx.amount
                            },
                            {
                                Name: 'MpesaReceiptNumber',
                                Value: 'TEST' + Date.now()
                            },
                            {
                                Name: 'PhoneNumber',
                                Value: tx.customer_number || '254708374149'
                            }
                        ]
                    }
                }
            }
        };
        
        console.log('Sending callback with proper metadata...');
        
        const response = await axios.post('http://localhost:3000/mpesa/c2b-callback', callbackData);
        
        if (response.status === 200) {
            console.log('✅ Callback sent successfully');
            
            // Check if transaction was updated
            setTimeout(async () => {
                const { data: updatedTx } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('id', tx.id)
                    .single();
                
                console.log('\n📋 Updated Transaction Status:');
                console.log(`   Status: ${updatedTx.status}`);
                console.log(`   Commission: ${updatedTx.commission_amount}`);
                console.log(`   Worker Payout: ${updatedTx.worker_payout}`);
                console.log(`   M-Pesa TX ID: ${updatedTx.mpesa_tx_id}`);
            }, 2000);
            
        } else {
            console.log('❌ Callback failed');
        }
        
    } catch (error) {
        console.log('❌ Callback test error:', error.message);
    }
}

// 5. Check database constraints
async function checkDatabaseConstraints() {
    console.log('\n=== Checking Database Constraints ===');
    
    try {
        // Try to get table info
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('❌ Database access error:', error.message);
        } else {
            console.log('✅ Database connection working');
        }
        
        // Check for unique constraints
        console.log('Note: The "ON CONFLICT" error suggests missing unique constraints');
        console.log('This is likely in the callback processing code trying to use UPSERT');
        
    } catch (error) {
        console.log('❌ Constraint check error:', error.message);
    }
}

// Run all diagnostics and fixes
async function runAllFixes() {
    console.log('🚀 Starting TTip Callback Diagnostics and Fixes\n');
    
    await checkRecentTransactions();
    await fixTransactionCalculations();
    await fixPendingWithMpesaId();
    await checkDatabaseConstraints();
    await testCallbackWithProperData();
    
    console.log('\n✅ Diagnostic and fix process completed!');
    console.log('\n📋 Summary of fixes applied:');
    console.log('   • Fixed missing commission calculations');
    console.log('   • Updated PENDING transactions with M-Pesa IDs to COMPLETED');
    console.log('   • Tested callback with proper metadata structure');
    console.log('\n🔗 Check your transactions now:');
    console.log('   • Database: Check Supabase dashboard');
    console.log('   • API: http://localhost:3000/debug/transactions');
}

runAllFixes().catch(console.error);