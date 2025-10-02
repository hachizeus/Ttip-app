import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function debugTransactions() {
    console.log('=== DEBUGGING TRANSACTIONS ===');
    
    // Get recent transactions
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    
    if (error) {
        console.error('Error fetching transactions:', error);
        return;
    }
    
    console.log(`Found ${transactions?.length || 0} recent transactions:`);
    
    transactions?.forEach((tx, index) => {
        console.log(`\n--- Transaction ${index + 1} ---`);
        console.log('ID:', tx.id);
        console.log('Worker ID:', tx.worker_id);
        console.log('Amount:', tx.amount);
        console.log('Status:', tx.status);
        console.log('Created:', tx.created_at);
        console.log('Raw Payload:', JSON.stringify(tx.raw_payload, null, 2));
        console.log('M-Pesa TX ID:', tx.mpesa_tx_id);
        console.log('Commission:', tx.commission_amount);
        console.log('Worker Payout:', tx.worker_payout);
    });
    
    // Check workers table
    const { data: workers } = await supabase
        .from('workers')
        .select('*')
        .limit(3);
    
    console.log('\n=== WORKERS TABLE ===');
    workers?.forEach(worker => {
        console.log(`${worker.name} (${worker.worker_id}): ${worker.total_tips} KSh, ${worker.tip_count} tips`);
    });
}

debugTransactions().catch(console.error);