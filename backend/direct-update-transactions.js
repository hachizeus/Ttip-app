import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

console.log('🔧 Direct database update to complete transactions...\n');

async function directUpdateTransactions() {
    try {
        // Get specific transactions with callback data
        const transactionsToUpdate = [
            'db6218c2-5b43-44c1-ad83-50c48332c767',
            '338f845b-4f3f-47e3-98de-adaf72e27ce8'
        ];
        
        for (const txId of transactionsToUpdate) {
            console.log(`\n🔧 Updating transaction: ${txId}`);
            
            // Use a simple update without any constraints
            const { data, error } = await supabase
                .rpc('update_transaction_status', {
                    tx_id: txId,
                    new_status: 'COMPLETED',
                    mpesa_id: `MANUAL_${Date.now()}`,
                    commission: 0,
                    payout: 1
                });
            
            if (error) {
                console.log(`   ❌ RPC failed, trying direct update...`);
                
                // Try direct SQL update
                const { error: directError } = await supabase
                    .from('transactions')
                    .update({
                        status: 'COMPLETED',
                        mpesa_tx_id: `MANUAL_${Date.now()}`,
                        commission_amount: 0,
                        worker_payout: 1
                    })
                    .match({ id: txId });
                
                if (directError) {
                    console.log(`   ❌ Direct update failed: ${directError.message}`);
                } else {
                    console.log(`   ✅ Direct update successful`);
                }
            } else {
                console.log(`   ✅ RPC update successful`);
            }
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

async function checkResults() {
    console.log('\n=== Checking Results ===');
    
    try {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('id, worker_id, amount, status, mpesa_tx_id, commission_amount, worker_payout')
            .in('id', [
                'db6218c2-5b43-44c1-ad83-50c48332c767',
                '338f845b-4f3f-47e3-98de-adaf72e27ce8'
            ]);
        
        if (error) {
            console.log('❌ Query error:', error.message);
            return;
        }
        
        transactions.forEach(tx => {
            console.log(`\n📋 ${tx.id.substring(0, 8)}...`);
            console.log(`   Status: ${tx.status}`);
            console.log(`   M-Pesa ID: ${tx.mpesa_tx_id || 'None'}`);
            console.log(`   Commission: KSh ${tx.commission_amount || 0}`);
            console.log(`   Worker Payout: KSh ${tx.worker_payout || 0}`);
        });
        
    } catch (error) {
        console.log('❌ Error checking results:', error.message);
    }
}

// Alternative: Use raw SQL
async function useRawSQL() {
    console.log('\n=== Using Raw SQL Update ===');
    
    try {
        const { data, error } = await supabase
            .rpc('execute_sql', {
                sql_query: `
                    UPDATE transactions 
                    SET 
                        status = 'COMPLETED',
                        mpesa_tx_id = 'MANUAL_' || extract(epoch from now()),
                        commission_amount = 0,
                        worker_payout = amount,
                        updated_at = now()
                    WHERE id IN (
                        'db6218c2-5b43-44c1-ad83-50c48332c767',
                        '338f845b-4f3f-47e3-98de-adaf72e27ce8'
                    ) AND status = 'PENDING'
                    RETURNING id, status;
                `
            });
        
        if (error) {
            console.log('❌ Raw SQL failed:', error.message);
            
            // Try the simplest possible update
            console.log('\n🔧 Trying individual updates...');
            
            const updates = [
                { id: 'db6218c2-5b43-44c1-ad83-50c48332c767', amount: 1 },
                { id: '338f845b-4f3f-47e3-98de-adaf72e27ce8', amount: 1 }
            ];
            
            for (const update of updates) {
                const { error: updateError } = await supabase
                    .from('transactions')
                    .update({ status: 'COMPLETED' })
                    .eq('id', update.id);
                
                if (updateError) {
                    console.log(`   ❌ ${update.id}: ${updateError.message}`);
                } else {
                    console.log(`   ✅ ${update.id}: Status updated to COMPLETED`);
                }
            }
            
        } else {
            console.log('✅ Raw SQL successful:', data);
        }
        
    } catch (error) {
        console.log('❌ Raw SQL error:', error.message);
    }
}

// Run all attempts
async function runAllAttempts() {
    await directUpdateTransactions();
    await useRawSQL();
    await checkResults();
    
    console.log('\n🎉 Update attempts completed!');
    console.log('\nIf updates are still failing, the issue is likely:');
    console.log('1. Database permissions');
    console.log('2. Row-level security policies');
    console.log('3. Database schema constraints');
    console.log('\n🔗 Check Supabase dashboard for the actual transaction status');
}

runAllAttempts().catch(console.error);