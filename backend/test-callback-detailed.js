import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Commission calculation
const calculatePayout = async (workerPhone, tipAmount) => {
    const { data: worker } = await supabase
        .from('workers')
        .select('referral_credits')
        .eq('phone', workerPhone)
        .single();
    
    const commissionRate = 0.03; // 3%
    
    if (worker?.referral_credits > 0) {
        // Use referral credit - no commission
        await supabase
            .from('workers')
            .update({ referral_credits: worker.referral_credits - 1 })
            .eq('phone', workerPhone);
        
        return {
            workerPayout: tipAmount,
            commission: 0,
            usedReferralCredit: true
        };
    } else {
        // Normal commission
        const commission = Math.round(tipAmount * commissionRate);
        return {
            workerPayout: tipAmount - commission,
            commission: commission,
            usedReferralCredit: false
        };
    }
};

async function testCallbackProcessing() {
    const CheckoutRequestID = "ws_CO_02102025170506392759001048";
    const amount = 1;
    const mpesaReceiptNumber = "TEST123456";
    const phoneNumber = "254708374149";
    
    console.log('=== TESTING CALLBACK PROCESSING ===');
    console.log('CheckoutRequestID:', CheckoutRequestID);
    
    // Find transaction
    const { data: transactions, error: searchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(20);
    
    console.log(`Found ${transactions?.length || 0} pending transactions`);
    
    let transaction = null;
    
    if (transactions) {
        for (const tx of transactions) {
            const rawPayload = tx.raw_payload;
            console.log(`Checking transaction ${tx.id}:`, rawPayload?.CheckoutRequestID);
            if (rawPayload && 
                (rawPayload.CheckoutRequestID === CheckoutRequestID ||
                 JSON.stringify(rawPayload).includes(CheckoutRequestID))) {
                transaction = tx;
                console.log(`✅ Found matching transaction: ${tx.id}`);
                break;
            }
        }
    }
    
    if (!transaction) {
        console.log('❌ No matching transaction found');
        return;
    }
    
    // Get worker details
    const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('name, phone')
        .eq('worker_id', transaction.worker_id)
        .single();
    
    if (workerError || !worker) {
        console.log('❌ Worker not found:', workerError);
        return;
    }
    
    console.log('✅ Worker found:', worker.name, worker.phone);
    
    // Calculate payout
    const { workerPayout, commission, usedReferralCredit } = await calculatePayout(
        worker.phone, 
        amount
    );
    
    console.log('Commission calculation:', { workerPayout, commission, usedReferralCredit });
    
    // Update transaction
    const { error: updateError } = await supabase
        .from('transactions')
        .update({
            mpesa_tx_id: mpesaReceiptNumber,
            status: 'COMPLETED',
            commission_amount: commission,
            worker_payout: workerPayout,
            used_referral_credit: usedReferralCredit
        })
        .eq('id', transaction.id);
    
    if (updateError) {
        console.log('❌ Transaction update error:', updateError);
    } else {
        console.log('✅ Transaction updated successfully');
    }
    
    // Update worker stats
    const { data: currentWorker } = await supabase
        .from('workers')
        .select('total_tips, tip_count')
        .eq('worker_id', transaction.worker_id)
        .single();
    
    const { error: workerUpdateError } = await supabase
        .from('workers')
        .update({
            total_tips: (currentWorker?.total_tips || 0) + workerPayout,
            tip_count: (currentWorker?.tip_count || 0) + 1
        })
        .eq('worker_id', transaction.worker_id);
    
    if (workerUpdateError) {
        console.log('❌ Worker stats update error:', workerUpdateError);
    } else {
        console.log('✅ Worker stats updated successfully');
    }
    
    console.log('=== PROCESSING COMPLETE ===');
}

testCallbackProcessing().catch(console.error);