import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function debugPaymentStatus() {
    const checkoutRequestId = "ws_CO_02102025170506392759001048";
    
    console.log('=== DEBUGGING PAYMENT STATUS ===');
    console.log('Looking for CheckoutRequestID:', checkoutRequestId);
    
    // Get recent transactions and search through them
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, status, amount, worker_id, created_at, raw_payload, mpesa_tx_id, commission_amount, worker_payout')
        .order('created_at', { ascending: false })
        .limit(10);
    
    console.log(`Found ${transactions?.length || 0} transactions`);
    
    let transaction = null;
    
    if (transactions) {
        for (const tx of transactions) {
            console.log(`\\nTransaction ${tx.id}:`);
            console.log('- Status:', tx.status);
            console.log('- M-Pesa TX ID:', tx.mpesa_tx_id);
            console.log('- Commission:', tx.commission_amount);
            console.log('- Worker Payout:', tx.worker_payout);
            console.log('- CheckoutRequestID in payload:', tx.raw_payload?.CheckoutRequestID);
            
            const rawPayload = tx.raw_payload;
            if (rawPayload && 
                (rawPayload.CheckoutRequestID === checkoutRequestId ||
                 JSON.stringify(rawPayload).includes(checkoutRequestId))) {
                transaction = tx;
                console.log('✅ MATCH FOUND!');
                break;
            }
        }
    }
    
    if (transaction) {
        console.log('\\n=== MATCHED TRANSACTION ===');
        console.log('ID:', transaction.id);
        console.log('Status:', transaction.status);
        console.log('M-Pesa TX ID:', transaction.mpesa_tx_id);
        console.log('Has M-Pesa TX ID?', !!transaction.mpesa_tx_id);
        
        // Apply the same logic as the endpoint
        let effectiveStatus = transaction.status || 'PENDING';
        if (transaction.mpesa_tx_id && effectiveStatus === 'PENDING') {
            effectiveStatus = 'COMPLETED';
            console.log('✅ Should show as COMPLETED due to M-Pesa TX ID');
        } else {
            console.log('❌ Will show as:', effectiveStatus);
        }
    } else {
        console.log('❌ No matching transaction found');
    }
}

debugPaymentStatus().catch(console.error);