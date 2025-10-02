import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function completeRecentTransaction() {
    const checkoutRequestId = "ws_CO_02102025173221441759001048";
    const transactionId = "0eff29bb-43e2-4559-8683-ccd721d6a83f";
    
    console.log('Completing recent transaction...');
    
    // Update transaction as completed
    await supabase
        .from('transactions')
        .update({
            mpesa_tx_id: 'COMPLETED123',
            commission_amount: 0,
            worker_payout: 1,
            used_referral_credit: false
        })
        .eq('id', transactionId);
    
    // Update worker stats
    const { data: worker } = await supabase
        .from('workers')
        .select('total_tips, tip_count')
        .eq('worker_id', 'WCMNAYISA')
        .single();
    
    await supabase
        .from('workers')
        .update({
            total_tips: (worker.total_tips || 0) + 1,
            tip_count: (worker.tip_count || 0) + 1
        })
        .eq('worker_id', 'WCMNAYISA');
    
    console.log('✅ Transaction completed manually');
    console.log('✅ Worker stats updated');
}

completeRecentTransaction().catch(console.error);