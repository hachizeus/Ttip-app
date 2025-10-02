// TTip Subscription Management Test Script
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testSubscriptions() {
    console.log('🧪 Testing Subscription Management...\n');
    
    // Get admin token
    const loginResponse = await axios.post(`${BASE_URL}/admin/login`, {
        username: 'admin',
        password: 'admin123',
        totpCode: '123456'
    });
    const token = loginResponse.data.token;
    const authHeaders = { 'Authorization': `Bearer ${token}` };
    
    try {
        // Test 1: Get current worker subscriptions
        console.log('✅ Test 1: Current worker subscriptions');
        const analyticsResponse = await axios.get(`${BASE_URL}/admin/analytics`, { headers: authHeaders });
        const workers = analyticsResponse.data.workers || [];
        
        console.log('Current Worker Subscriptions:');
        workers.forEach(worker => {
            const expiryDate = new Date(worker.subscription_expiry);
            const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            
            console.log(`- ${worker.name} (${worker.worker_id}):`);
            console.log(`  Plan: ${worker.subscription_plan}`);
            console.log(`  Expires: ${expiryDate.toLocaleDateString()}`);
            console.log(`  Days left: ${daysLeft > 0 ? daysLeft : 'EXPIRED'}`);
            console.log(`  Tips received: ${worker.tip_count || 0}`);
            console.log(`  Total earnings: KSh ${worker.total_tips || 0}`);
        });
        
        // Test 2: Subscription plan analysis
        console.log('\n✅ Test 2: Subscription plan analysis');
        const planCounts = workers.reduce((acc, worker) => {
            acc[worker.subscription_plan] = (acc[worker.subscription_plan] || 0) + 1;
            return acc;
        }, {});
        
        console.log('Plan Distribution:');
        Object.entries(planCounts).forEach(([plan, count]) => {
            console.log(`- ${plan}: ${count} workers`);
        });
        
        // Test 3: Revenue by subscription plan
        console.log('\n✅ Test 3: Revenue by subscription plan');
        const revenueByPlan = workers.reduce((acc, worker) => {
            const plan = worker.subscription_plan;
            acc[plan] = (acc[plan] || 0) + (worker.total_tips || 0);
            return acc;
        }, {});
        
        console.log('Revenue by Plan:');
        Object.entries(revenueByPlan).forEach(([plan, revenue]) => {
            console.log(`- ${plan}: KSh ${revenue}`);
        });
        
        // Test 4: Subscription expiry analysis
        console.log('\n✅ Test 4: Subscription expiry analysis');
        const now = new Date();
        const expiryAnalysis = {
            expired: 0,
            expiringSoon: 0, // within 7 days
            active: 0
        };
        
        workers.forEach(worker => {
            const expiryDate = new Date(worker.subscription_expiry);
            const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysLeft <= 0) {
                expiryAnalysis.expired++;
            } else if (daysLeft <= 7) {
                expiryAnalysis.expiringSoon++;
            } else {
                expiryAnalysis.active++;
            }
        });
        
        console.log('Subscription Status:');
        console.log(`- Active: ${expiryAnalysis.active}`);
        console.log(`- Expiring soon (≤7 days): ${expiryAnalysis.expiringSoon}`);
        console.log(`- Expired: ${expiryAnalysis.expired}`);
        
        // Test 5: Pro vs Free performance comparison
        console.log('\n✅ Test 5: Pro vs Free performance comparison');
        const proWorkers = workers.filter(w => w.subscription_plan === 'pro');
        const freeWorkers = workers.filter(w => w.subscription_plan === 'free');
        
        const proStats = {
            count: proWorkers.length,
            totalTips: proWorkers.reduce((sum, w) => sum + (w.total_tips || 0), 0),
            totalTransactions: proWorkers.reduce((sum, w) => sum + (w.tip_count || 0), 0)
        };
        
        const freeStats = {
            count: freeWorkers.length,
            totalTips: freeWorkers.reduce((sum, w) => sum + (w.total_tips || 0), 0),
            totalTransactions: freeWorkers.reduce((sum, w) => sum + (w.tip_count || 0), 0)
        };
        
        console.log('Performance Comparison:');
        console.log('Pro Workers:');
        console.log(`- Count: ${proStats.count}`);
        console.log(`- Total tips: KSh ${proStats.totalTips}`);
        console.log(`- Total transactions: ${proStats.totalTransactions}`);
        console.log(`- Avg per worker: KSh ${proStats.count > 0 ? Math.round(proStats.totalTips / proStats.count) : 0}`);
        
        console.log('Free Workers:');
        console.log(`- Count: ${freeStats.count}`);
        console.log(`- Total tips: KSh ${freeStats.totalTips}`);
        console.log(`- Total transactions: ${freeStats.totalTransactions}`);
        console.log(`- Avg per worker: KSh ${freeStats.count > 0 ? Math.round(freeStats.totalTips / freeStats.count) : 0}`);
        
        // Test 6: Subscription renewal recommendations
        console.log('\n✅ Test 6: Subscription renewal recommendations');
        const renewalCandidates = workers.filter(worker => {
            const expiryDate = new Date(worker.subscription_expiry);
            const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            return daysLeft <= 7 && (worker.tip_count || 0) > 0;
        });
        
        console.log('Workers recommended for renewal:');
        renewalCandidates.forEach(worker => {
            const expiryDate = new Date(worker.subscription_expiry);
            const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            console.log(`- ${worker.name}: ${daysLeft} days left, ${worker.tip_count} tips received`);
        });
        
        console.log('\n🎉 Subscription Tests Completed!');
        return { workers, planCounts, revenueByPlan, expiryAnalysis };
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { testSubscriptions };

// Run if called directly
if (require.main === module) {
    testSubscriptions().catch(console.error);
}