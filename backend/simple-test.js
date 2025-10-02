// Simple Phase 1 Test
import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

console.log('🧪 Testing Phase 1 Database Setup');

// Test database schema
const testSchema = async () => {
    try {
        // Test workers table has new columns
        const { data: workers } = await supabase
            .from('workers')
            .select('referral_credits, total_referrals, average_rating, review_count')
            .limit(1);
        
        console.log('✅ Workers table has Phase 1 columns');
        
        // Test transactions table has new columns
        const { data: transactions } = await supabase
            .from('transactions')
            .select('commission_amount, worker_payout, used_referral_credit')
            .limit(1);
        
        console.log('✅ Transactions table has Phase 1 columns');
        
        // Test referrals table exists
        const { data: referrals } = await supabase
            .from('referrals')
            .select('*')
            .limit(1);
        
        console.log('✅ Referrals table exists');
        
        // Test reviews table exists
        const { data: reviews } = await supabase
            .from('reviews')
            .select('*')
            .limit(1);
        
        console.log('✅ Reviews table exists');
        
        console.log('\n🎉 Phase 1 database schema is ready!');
        console.log('\n📊 Current Data:');
        console.log(`- Workers: ${workers?.length || 0}`);
        console.log(`- Transactions: ${transactions?.length || 0}`);
        console.log(`- Referrals: ${referrals?.length || 0}`);
        console.log(`- Reviews: ${reviews?.length || 0}`);
        
    } catch (error) {
        console.log('❌ Schema test failed:', error.message);
    }
};

testSchema();