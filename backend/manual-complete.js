import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function manuallyCompleteTransaction() {
    const transactionId = "226942aa-2d1d-4119-b124-8db4562a000b";
    
    console.log('Manually completing transaction...');
    
    // Get current transaction
    const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();
    
    console.log('Current transaction:', {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        worker_id: transaction.worker_id
    });
    
    // Try updating each field separately
    console.log('\\n1. Updating worker_payout...');
    const { error: payoutError } = await supabase
        .from('transactions')
        .update({ worker_payout: 1 })
        .eq('id', transactionId);
    
    if (payoutError) {
        console.log('❌ Payout error:', payoutError);
    } else {
        console.log('✅ Worker payout updated');
    }
    
    console.log('\\n2. Updating commission_amount...');
    const { error: commissionError } = await supabase
        .from('transactions')
        .update({ commission_amount: 0 })
        .eq('id', transactionId);
    
    if (commissionError) {
        console.log('❌ Commission error:', commissionError);
    } else {
        console.log('✅ Commission updated');
    }
    
    console.log('\\n3. Updating used_referral_credit...');
    const { error: referralError } = await supabase
        .from('transactions')
        .update({ used_referral_credit: false })
        .eq('id', transactionId);
    
    if (referralError) {
        console.log('❌ Referral error:', referralError);
    } else {
        console.log('✅ Referral credit updated');
    }
    
    console.log('\\n4. Finally updating status...');
    
    // Try using a different method - select then update
    const { data: existingCompleted } = await supabase
        .from('transactions')
        .select('id')
        .eq('status', 'COMPLETED')
        .limit(1);
    
    if (existingCompleted && existingCompleted.length > 0) {
        console.log('Found existing COMPLETED transaction, so COMPLETED is valid');
        
        // Try direct update without any other conditions
        const { error: statusError, data: updateData } = await supabase
            .from('transactions')
            .update({ status: 'COMPLETED' })
            .eq('id', transactionId)
            .select();
        
        if (statusError) {
            console.log('❌ Status error:', statusError);
        } else {
            console.log('✅ Status updated successfully!');
            console.log('Updated data:', updateData);
        }
    }
}

manuallyCompleteTransaction().catch(console.error);