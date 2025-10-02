// TTip Complete Test Suite Runner
const { testWorkerSignup } = require('./01-worker-signup-test');
const { testQRCodeFlow } = require('./02-qr-code-test');
const { testPaymentFlow } = require('./03-payment-flow-test');
const { testAdminAuth } = require('./04-admin-auth-test');
const { testAnalytics } = require('./05-analytics-test');
const { testSubscriptions } = require('./06-subscription-test');
const { testSecurity } = require('./07-security-test');

async function runAllTests() {
    console.log('🚀 TTip Complete Application Test Suite\n');
    console.log('=' .repeat(60));
    
    const testResults = {
        passed: 0,
        failed: 0,
        total: 7,
        results: []
    };
    
    const tests = [
        { name: 'Worker Signup', fn: testWorkerSignup },
        { name: 'QR Code Flow', fn: testQRCodeFlow },
        { name: 'Payment Flow', fn: testPaymentFlow },
        { name: 'Admin Authentication', fn: testAdminAuth },
        { name: 'Analytics & Dashboard', fn: testAnalytics },
        { name: 'Subscription Management', fn: testSubscriptions },
        { name: 'Security & Vulnerabilities', fn: testSecurity }
    ];
    
    for (const test of tests) {
        try {
            console.log(`\n🧪 Running ${test.name} Tests...`);
            console.log('-'.repeat(40));
            
            const startTime = Date.now();
            const result = await test.fn();
            const duration = Date.now() - startTime;
            
            testResults.passed++;
            testResults.results.push({
                name: test.name,
                status: 'PASSED',
                duration: `${duration}ms`,
                result
            });
            
            console.log(`✅ ${test.name} Tests: PASSED (${duration}ms)`);
            
        } catch (error) {
            testResults.failed++;
            testResults.results.push({
                name: test.name,
                status: 'FAILED',
                error: error.message
            });
            
            console.log(`❌ ${test.name} Tests: FAILED`);
            console.error('Error:', error.message);
        }
        
        // Wait between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Final Results Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TEST SUITE RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    testResults.results.forEach(result => {
        const status = result.status === 'PASSED' ? '✅' : '❌';
        const duration = result.duration ? ` (${result.duration})` : '';
        console.log(`${status} ${result.name}${duration}`);
    });
    
    console.log('\n📊 OVERALL STATISTICS:');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! TTip application is fully functional.');
        console.log('✅ Ready for production deployment.');
    } else {
        console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please review and fix issues.`);
    }
    
    console.log('\n🔍 TESTED FUNCTIONALITIES:');
    console.log('✅ Worker registration and validation');
    console.log('✅ QR code generation and scanning');
    console.log('✅ M-Pesa STK push payments');
    console.log('✅ Admin authentication and security');
    console.log('✅ Real-time analytics and dashboard');
    console.log('✅ Subscription management');
    console.log('✅ Security vulnerabilities and protection');
    console.log('✅ Rate limiting and CSRF protection');
    console.log('✅ Input validation and sanitization');
    console.log('✅ Session management and JWT tokens');
    
    return testResults;
}

// Health check before running tests
async function healthCheck() {
    const axios = require('axios');
    try {
        const response = await axios.get('http://localhost:3000/health');
        console.log('🟢 Server health check: PASSED');
        console.log('Server status:', response.data.status);
        return true;
    } catch (error) {
        console.log('🔴 Server health check: FAILED');
        console.log('Make sure the TTip server is running on port 3000');
        return false;
    }
}

// Main execution
async function main() {
    console.log('🏥 Performing health check...');
    const isHealthy = await healthCheck();
    
    if (!isHealthy) {
        console.log('\n❌ Cannot run tests - server is not responding');
        console.log('Please start the server with: node phase1-server.js');
        process.exit(1);
    }
    
    console.log('🚀 Starting comprehensive test suite...\n');
    
    try {
        const results = await runAllTests();
        process.exit(results.failed === 0 ? 0 : 1);
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { runAllTests, healthCheck };