import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

console.log('🔧 Manually completing transactions with callback data...\n');

async function completeTransactionsWithCallbacks() {
    try {
        // Get transactions that have callback data but are still PENDING
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('status', 'PENDING')
            .not('raw_payload->callback', 'is', null);
        
        if (error) {
            console.log('❌ Query error:', error.message);
            return;
        }
        
        console.log(`Found ${transactions.length} transactions with callback data to complete`);
        
        for (const tx of transactions) {
            const callback = tx.raw_payload?.callback;
            
            if (callback && callback.ResultCode === 0) {
                console.log(`\n🔧 Completing transaction: ${tx.id}`);
                console.log(`   Worker: ${tx.worker_id}`);
                console.log(`   Amount: KSh ${tx.amount}`);
                
                // Extract M-Pesa receipt number
                let mpesaReceiptNumber = callback.MpesaReceiptNumber;
                
                // If not directly available, check CallbackMetadata
                if (!mpesaReceiptNumber && callback.CallbackMetadata?.Item) {
                    const receiptItem = callback.CallbackMetadata.Item.find(item => 
                        item.Name === 'MpesaReceiptNumber'
                    );
                    mpesaReceiptNumber = receiptItem?.Value;
                }
                
                console.log(`   M-Pesa Receipt: ${mpesaReceiptNumber || 'Not found'}`);
                
                // Calculate commission (5%)
                const amount = parseFloat(tx.amount);
                const commission = Math.round(amount * 0.05);
                const workerPayout = amount - commission;
                
                // Update transaction to COMPLETED
                const { error: updateError } = await supabase
                    .from('transactions')
                    .update({
                        status: 'COMPLETED',
                        mpesa_tx_id: mpesaReceiptNumber || `MANUAL_${Date.now()}`,
                        commission_amount: commission,
                        worker_payout: workerPayout,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', tx.id);
                
                if (updateError) {
                    console.log(`   ❌ Update failed: ${updateError.message}`);
                } else {
                    console.log(`   ✅ Completed successfully`);
                    console.log(`   💰 Commission: KSh ${commission}`);
                    console.log(`   👤 Worker Payout: KSh ${workerPayout}`);
                }
            } else {
                console.log(`\n⚠️  Transaction ${tx.id} has callback but ResultCode is not 0`);
            }
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

async function showCompletedTransactions() {
    console.log('\n=== Checking Completed Transactions ===');
    
    try {
        const { data: completed, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('status', 'COMPLETED')
            .order('updated_at', { ascending: false })
            .limit(5);
        
        if (error) {
            console.log('❌ Query error:', error.message);
            return;
        }
        
        console.log(`\n✅ Found ${completed.length} completed transactions:`);
        
        completed.forEach(tx => {
            console.log(`\n📋 ${tx.id}`);
            console.log(`   Worker: ${tx.worker_id}`);
            console.log(`   Amount: KSh ${tx.amount}`);
            console.log(`   Commission: KSh ${tx.commission_amount}`);
            console.log(`   Worker Payout: KSh ${tx.worker_payout}`);
            console.log(`   M-Pesa ID: ${tx.mpesa_tx_id}`);
            console.log(`   Completed: ${new Date(tx.updated_at || tx.created_at).toLocaleString()}`);
        });
        
    } catch (error) {
        console.log('❌ Error checking completed:', error.message);
    }
}

// Run the fix
async function runFix() {
    await completeTransactionsWithCallbacks();
    await showCompletedTransactions();
    
    console.log('\n🎉 Transaction completion process finished!');
    console.log('\n🔗 Check your results:');
    console.log('   • Analytics Dashboard: http://localhost:3000/analytics-dashboard.html');
    console.log('   • Debug API: http://localhost:3000/debug/transactions');
}

runFix().catch(console.error);