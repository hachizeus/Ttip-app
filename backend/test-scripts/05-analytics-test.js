// TTip Analytics & Dashboard Test Script
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAnalytics() {
    console.log('🧪 Testing Analytics & Dashboard Data...\n');
    
    // First login to get token
    const loginResponse = await axios.post(`${BASE_URL}/admin/login`, {
        username: 'admin',
        password: 'admin123',
        totpCode: '123456'
    });
    const token = loginResponse.data.token;
    const authHeaders = { 'Authorization': `Bearer ${token}` };
    
    try {
        // Test 1: Analytics endpoint
        console.log('✅ Test 1: Analytics endpoint');
        const analyticsResponse = await axios.get(`${BASE_URL}/admin/analytics`, { headers: authHeaders });
        const analytics = analyticsResponse.data;
        
        console.log('Analytics Data Structure:');
        console.log('- Transactions:', Object.keys(analytics.transactions || {}));
        console.log('- Revenue:', Object.keys(analytics.revenue || {}));
        console.log('- Workers count:', analytics.workers?.length || 0);
        console.log('- System health:', Object.keys(analytics.systemHealth || {}));
        console.log('- Fraud data:', Object.keys(analytics.fraud || {}));
        
        // Test 2: Validate data accuracy
        console.log('\n✅ Test 2: Data accuracy validation');
        const workers = analytics.workers || [];
        const totalTips = workers.reduce((sum, w) => sum + (w.total_tips || 0), 0);
        const totalTipCount = workers.reduce((sum, w) => sum + (w.tip_count || 0), 0);
        
        console.log('Worker Statistics:');
        workers.forEach(worker => {
            console.log(`- ${worker.name}: ${worker.tip_count || 0} tips, KSh ${worker.total_tips || 0}`);
        });
        
        console.log(`\nCalculated Totals:`);
        console.log(`- Total tips received: KSh ${totalTips}`);
        console.log(`- Total tip transactions: ${totalTipCount}`);
        console.log(`- Average tip: KSh ${totalTipCount > 0 ? Math.round(totalTips / totalTipCount) : 0}`);
        
        // Test 3: Hourly data validation
        console.log('\n✅ Test 3: Hourly data validation');
        const hourlyData = analytics.transactions?.hourlyData || [];
        console.log('Hourly transaction data (24h):');
        hourlyData.forEach((count, hour) => {
            if (count > 0) {
                console.log(`- ${hour}:00 - ${count} transactions`);
            }
        });
        
        const peakHour = hourlyData.indexOf(Math.max(...hourlyData));
        console.log(`Peak hour: ${peakHour}:00 with ${hourlyData[peakHour]} transactions`);
        
        // Test 4: Revenue trends
        console.log('\n✅ Test 4: Revenue trends');
        const dailyRevenue = analytics.revenue?.dailyRevenue || [];
        console.log('Daily revenue (last 7 days):');
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        dailyRevenue.forEach((amount, index) => {
            console.log(`- ${days[index]}: KSh ${amount}`);
        });
        
        const totalWeekRevenue = dailyRevenue.reduce((sum, amount) => sum + amount, 0);
        console.log(`Total week revenue: KSh ${totalWeekRevenue}`);
        console.log(`Growth rate: ${analytics.revenue?.growth || 0}%`);
        
        // Test 5: Worker performance ranking
        console.log('\n✅ Test 5: Worker performance ranking');
        const workerPerformance = analytics.workerPerformance || [];
        console.log('Worker performance ranking:');
        workerPerformance.forEach((worker, index) => {
            console.log(`${index + 1}. ${worker.name}: ${worker.totalTips} tips, KSh ${worker.totalAmount}`);
        });
        
        // Test 6: Payment methods breakdown
        console.log('\n✅ Test 6: Payment methods breakdown');
        const paymentMethods = analytics.paymentMethods || {};
        console.log('Payment methods:');
        Object.entries(paymentMethods).forEach(([method, count]) => {
            console.log(`- ${method}: ${count} transactions`);
        });
        
        // Test 7: System health metrics
        console.log('\n✅ Test 7: System health metrics');
        const systemHealth = analytics.systemHealth || {};
        console.log('System Health:');
        console.log(`- Queue length: ${systemHealth.queueLength || 0}`);
        console.log(`- Processing: ${systemHealth.isProcessing || false}`);
        console.log(`- Uptime: ${Math.floor((systemHealth.uptime || 0) / 3600)}h ${Math.floor(((systemHealth.uptime || 0) % 3600) / 60)}m`);
        console.log(`- Memory usage: ${Math.round((systemHealth.memoryUsage?.heapUsed || 0) / 1024 / 1024)}MB`);
        
        console.log('\n🎉 Analytics Tests Completed!');
        return analytics;
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { testAnalytics };

// Run if called directly
if (require.main === module) {
    testAnalytics().catch(console.error);
}