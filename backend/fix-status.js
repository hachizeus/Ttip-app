import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function fixTransactionStatus() {
    const transactionId = "226942aa-2d1d-4119-b124-8db4562a000b";
    
    console.log('Trying different approaches to update status...');
    
    // Try using SQL directly
    const { error: sqlError } = await supabase
        .rpc('update_transaction_status', {
            transaction_id: transactionId,
            new_status: 'COMPLETED'
        });
    
    if (sqlError) {
        console.log('❌ SQL RPC error:', sqlError);
        
        // Try raw SQL
        const { error: rawError } = await supabase
            .from('transactions')
            .update({ status: 'COMPLETED' })
            .eq('id', transactionId);
        
        if (rawError) {
            console.log('❌ Raw update error:', rawError);
            
            // Check what status values are allowed
            const { data: transaction } = await supabase
                .from('transactions')
                .select('status')
                .eq('id', transactionId)
                .single();
            
            console.log('Current status:', transaction?.status);
            
            // Try different status values
            const statusOptions = ['COMPLETED', 'completed', 'SUCCESS', 'success'];
            
            for (const status of statusOptions) {
                const { error } = await supabase
                    .from('transactions')
                    .update({ status })
                    .eq('id', transactionId);
                
                if (!error) {
                    console.log(`✅ Status updated to: ${status}`);
                    break;
                } else {
                    console.log(`❌ Failed to set status to ${status}:`, error.message);
                }
            }
        } else {
            console.log('✅ Raw update successful');
        }
    } else {
        console.log('✅ SQL RPC successful');
    }
}

fixTransactionStatus().catch(console.error);