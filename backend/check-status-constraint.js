import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkStatusConstraint() {
    console.log('Checking what status values are allowed...');
    
    // Get existing status values from the database
    const { data: transactions } = await supabase
        .from('transactions')
        .select('status')
        .limit(20);
    
    const uniqueStatuses = [...new Set(transactions?.map(t => t.status))];
    console.log('Existing status values:', uniqueStatuses);
    
    // Try common status values
    const testStatuses = [
        'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED',
        'pending', 'processing', 'completed', 'failed', 'cancelled',
        'SUCCESS', 'ERROR', 'TIMEOUT'
    ];
    
    const transactionId = "1178101b-b181-4b5e-a205-0423145fc21e"; // Use a different transaction
    
    for (const status of testStatuses) {
        try {
            const { error } = await supabase
                .from('transactions')
                .update({ status })
                .eq('id', transactionId);
            
            if (!error) {
                console.log(`✅ ${status} is ALLOWED`);
                
                // Reset back to PENDING for next test
                await supabase
                    .from('transactions')
                    .update({ status: 'PENDING' })
                    .eq('id', transactionId);
                
                break; // Found a working status
            } else {
                console.log(`❌ ${status} is NOT allowed: ${error.message}`);
            }
        } catch (err) {
            console.log(`❌ ${status} caused error: ${err.message}`);
        }
    }
}

checkStatusConstraint().catch(console.error);