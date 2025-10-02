import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function completeCurrentTransaction() {
    const transactionId = "1a196261-6ead-431e-806d-56e7e8f2db6a";
    
    console.log('Completing current transaction...');
    
    // Update transaction as completed
    await supabase
        .from('transactions')
        .update({
            mpesa_tx_id: 'MANUAL_COMPLETE',
            commission_amount: 0,
            worker_payout: 1
        })
        .eq('id', transactionId);
    
    console.log('✅ Transaction marked as completed');
}

completeCurrentTransaction().catch(console.error);