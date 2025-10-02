import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function testSimpleUpdate() {
    const transactionId = "226942aa-2d1d-4119-b124-8db4562a000b";
    
    console.log('Testing simple transaction update...');
    
    // First, just try to update the status
    const { error: statusError } = await supabase
        .from('transactions')
        .update({ status: 'COMPLETED' })
        .eq('id', transactionId);
    
    if (statusError) {
        console.log('❌ Status update error:', statusError);
    } else {
        console.log('✅ Status updated successfully');
    }
    
    // Try to update mpesa_tx_id
    const { error: mpesaError } = await supabase
        .from('transactions')
        .update({ mpesa_tx_id: 'TEST123456' })
        .eq('id', transactionId);
    
    if (mpesaError) {
        console.log('❌ M-Pesa TX ID update error:', mpesaError);
    } else {
        console.log('✅ M-Pesa TX ID updated successfully');
    }
    
    // Check if commission columns exist
    const { error: commissionError } = await supabase
        .from('transactions')
        .update({ commission_amount: 0 })
        .eq('id', transactionId);
    
    if (commissionError) {
        console.log('❌ Commission update error:', commissionError);
        console.log('This suggests commission_amount column does not exist');
    } else {
        console.log('✅ Commission updated successfully');
    }
}

testSimpleUpdate().catch(console.error);