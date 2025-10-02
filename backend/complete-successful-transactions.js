import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function completeSuccessfulTransactions() {
    console.log('=== COMPLETING SUCCESSFUL TRANSACTIONS ===');
    
    // Find transactions that have M-Pesa TX ID but are still PENDING
    const { data: pendingTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'PENDING')
        .not('mpesa_tx_id', 'is', null);
    
    console.log(`Found ${pendingTransactions?.length || 0} transactions with M-Pesa TX ID but still PENDING`);
    
    if (!pendingTransactions || pendingTransactions.length === 0) {
        console.log('No transactions to complete');
        return;
    }
    
    for (const tx of pendingTransactions) {
        console.log(`\\nProcessing transaction ${tx.id}:`);
        console.log('- Amount:', tx.amount);
        console.log('- M-Pesa TX ID:', tx.mpesa_tx_id);
        console.log('- Worker ID:', tx.worker_id);
        
        // Get worker details
        const { data: worker } = await supabase
            .from('workers')
            .select('name, phone, total_tips, tip_count')
            .eq('worker_id', tx.worker_id)
            .single();
        
        if (!worker) {
            console.log('❌ Worker not found');
            continue;
        }
        
        console.log('- Worker:', worker.name);
        console.log('- Current tips:', worker.total_tips, 'KSh');
        console.log('- Current tip count:', worker.tip_count);
        
        // Calculate commission (3% or 0 if referral credit used)
        const commission = tx.commission_amount || Math.round(tx.amount * 0.03);
        const workerPayout = tx.worker_payout || (tx.amount - commission);
        
        console.log('- Commission:', commission);
        console.log('- Worker payout:', workerPayout);
        
        // Update transaction fields (except status which has issues)
        await supabase
            .from('transactions')
            .update({
                commission_amount: commission,
                worker_payout: workerPayout,
                used_referral_credit: false
            })
            .eq('id', tx.id);
        
        // Update worker stats if not already updated
        if (tx.worker_payout === 0 || tx.worker_payout === null) {
            const newTotalTips = (worker.total_tips || 0) + workerPayout;
            const newTipCount = (worker.tip_count || 0) + 1;
            
            await supabase
                .from('workers')
                .update({
                    total_tips: newTotalTips,
                    tip_count: newTipCount
                })
                .eq('worker_id', tx.worker_id);
            
            console.log('✅ Worker stats updated:', newTotalTips, 'KSh,', newTipCount, 'tips');
        } else {
            console.log('✅ Worker stats already updated');
        }
        
        console.log('✅ Transaction processed (status will show as completed in frontend)');
    }
    
    console.log('\\n=== SUMMARY ===');
    console.log('All successful transactions have been processed.');
    console.log('The frontend will now show them as completed based on M-Pesa TX ID.');
    console.log('Worker stats have been updated with the correct tip amounts.');
}

completeSuccessfulTransactions().catch(console.error);