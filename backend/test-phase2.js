// TTip Phase 2 Test Script
// Tests: Analytics, Forecasting, Recurring Tips, Notifications, Marketing

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

console.log('🚀 TTip Phase 2 Testing Started');
console.log('Testing: Analytics, Forecasting, Recurring Tips, Marketing');
console.log('='.repeat(60));

// Helper function to make API calls
const apiCall = async (method, endpoint, data = null) => {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (data) config.data = data;
        
        const response = await axios(config);
        return { success: true, data: response.data };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data?.error || error.message 
        };
    }
};

// Test 1: Analytics Dashboard
const testAnalyticsDashboard = async () => {
    console.log('\n📊 Test 1: Analytics Dashboard');
    
    try {
        const workerId = 'W001TEST';
        
        // Test analytics endpoint
        console.log('Testing analytics endpoint...');
        const analytics = await apiCall('GET', `/api/analytics/${workerId}?period=30`);
        
        if (!analytics.success) {
            console.log('❌ Analytics endpoint failed:', analytics.error);
            return false;
        }
        
        console.log('✅ Analytics data retrieved');
        console.log('   Analytics:', {
            totalTips: analytics.data.analytics?.total_tips || 0,
            conversionRate: analytics.data.analytics?.conversion_rate || 0,
            peakHour: analytics.data.peakHour || 12
        });
        
        // Test performance metrics
        if (analytics.data.performance && analytics.data.performance.length > 0) {
            console.log('✅ Performance metrics available');
            console.log(`   Found ${analytics.data.performance.length} days of data`);
        } else {
            console.log('⚠️  No performance metrics data (expected for new setup)');
        }
        
        // Test customer insights
        if (analytics.data.topCustomers && analytics.data.topCustomers.length > 0) {
            console.log('✅ Customer insights available');
            console.log(`   Found ${analytics.data.topCustomers.length} customer records`);
        } else {
            console.log('⚠️  No customer insights data (expected for new setup)');
        }
        
        return true;
        
    } catch (error) {
        console.log('❌ Analytics test failed:', error.message);
        return false;
    }
};

// Test 2: Earnings Forecast
const testEarningsForecast = async () => {
    console.log('\n🔮 Test 2: Earnings Forecast');
    
    try {
        const workerId = 'W001TEST';
        
        console.log('Testing forecast endpoint...');
        const forecast = await apiCall('GET', `/api/forecast/${workerId}?days=30`);
        
        if (!forecast.success) {
            console.log('❌ Forecast endpoint failed:', forecast.error);
            return false;
        }
        
        if (forecast.data.message) {
            console.log('⚠️  Forecast message:', forecast.data.message);
            return true; // Expected for insufficient data
        }
        
        if (forecast.data.forecast && forecast.data.forecast.length > 0) {
            console.log('✅ Forecast generated successfully');
            console.log(`   Generated ${forecast.data.forecast.length} days of forecast`);
            console.log('   Sample forecast:', {
                date: forecast.data.forecast[0].date,
                predicted: forecast.data.forecast[0].predicted_earnings,
                confidence: forecast.data.forecast[0].confidence_level
            });
            
            const totalForecast = forecast.data.forecast.reduce((sum, f) => sum + f.predicted_earnings, 0);
            console.log(`   Total 30-day forecast: KSh ${totalForecast}`);
        } else {
            console.log('⚠️  No forecast data generated');
        }
        
        return true;
        
    } catch (error) {
        console.log('❌ Forecast test failed:', error.message);
        return false;
    }
};

// Test 3: Recurring Tips
const testRecurringTips = async () => {
    console.log('\n🔄 Test 3: Recurring Tips');
    
    try {
        console.log('Setting up recurring tip...');
        const recurringTip = await apiCall('POST', '/api/recurring-tips', {
            customerPhone: '254700000999',
            workerId: 'W001TEST',
            amount: 500,
            frequency: 'monthly'
        });
        
        if (!recurringTip.success) {
            console.log('❌ Recurring tip setup failed:', recurringTip.error);
            return false;
        }
        
        console.log('✅ Recurring tip setup successful');
        console.log('   Details:', {
            amount: recurringTip.data.recurringTip.amount,
            frequency: recurringTip.data.recurringTip.frequency,
            nextPayment: recurringTip.data.recurringTip.next_payment_date,
            status: recurringTip.data.recurringTip.status
        });
        
        // Verify in database
        const { data: storedTip } = await supabase
            .from('recurring_tips')
            .select('*')
            .eq('id', recurringTip.data.recurringTip.id)
            .single();
        
        if (storedTip) {
            console.log('✅ Recurring tip stored in database');
            return recurringTip.data.recurringTip.id;
        } else {
            console.log('❌ Recurring tip not found in database');
            return false;
        }
        
    } catch (error) {
        console.log('❌ Recurring tips test failed:', error.message);
        return false;
    }
};

// Test 4: Customer Feedback
const testCustomerFeedback = async () => {
    console.log('\n💬 Test 4: Customer Feedback');
    
    try {
        console.log('Submitting customer feedback...');
        const feedback = await apiCall('POST', '/api/feedback', {
            workerId: 'W001TEST',
            customerPhone: '254700000999',
            feedbackType: 'service',
            rating: 5,
            message: 'Excellent service! Very professional and friendly staff.'
        });
        
        if (!feedback.success) {
            console.log('❌ Feedback submission failed:', feedback.error);
            return false;
        }
        
        console.log('✅ Feedback submitted successfully');
        console.log('   Details:', {
            type: feedback.data.feedback.feedback_type,
            rating: feedback.data.feedback.rating,
            status: feedback.data.feedback.status
        });
        
        // Verify in database
        const { data: storedFeedback } = await supabase\n            .from('customer_feedback')\n            .select('*')\n            .eq('id', feedback.data.feedback.id)\n            .single();\n        \n        if (storedFeedback) {\n            console.log('✅ Feedback stored in database');\n            return true;\n        } else {\n            console.log('❌ Feedback not found in database');\n            return false;\n        }\n        \n    } catch (error) {\n        console.log('❌ Customer feedback test failed:', error.message);\n        return false;\n    }\n};\n\n// Test 5: Marketing Campaigns\nconst testMarketingCampaigns = async () => {\n    console.log('\\n🎯 Test 5: Marketing Campaigns');\n    \n    try {\n        console.log('Fetching active campaigns...');\n        const campaigns = await apiCall('GET', '/api/campaigns/active');\n        \n        if (!campaigns.success) {\n            console.log('❌ Campaigns endpoint failed:', campaigns.error);\n            return false;\n        }\n        \n        console.log('✅ Campaigns endpoint working');\n        \n        if (campaigns.data.campaigns && campaigns.data.campaigns.length > 0) {\n            console.log(`   Found ${campaigns.data.campaigns.length} active campaigns`);\n            campaigns.data.campaigns.forEach(campaign => {\n                console.log(`   - ${campaign.campaign_name}: ${campaign.campaign_type}`);\n            });\n        } else {\n            console.log('   No active campaigns found');\n        }\n        \n        return true;\n        \n    } catch (error) {\n        console.log('❌ Marketing campaigns test failed:', error.message);\n        return false;\n    }\n};\n\n// Test 6: Tax Reporting\nconst testTaxReporting = async () => {\n    console.log('\\n📋 Test 6: Tax Reporting');\n    \n    try {\n        const workerId = 'W001TEST';\n        const currentYear = new Date().getFullYear();\n        const currentMonth = new Date().getMonth() + 1;\n        \n        console.log(`Generating tax report for ${currentYear}-${currentMonth}...`);\n        const taxReport = await apiCall('GET', `/api/tax-report/${workerId}/${currentYear}/${currentMonth}`);\n        \n        if (!taxReport.success) {\n            console.log('❌ Tax report generation failed:', taxReport.error);\n            return false;\n        }\n        \n        console.log('✅ Tax report generated successfully');\n        console.log('   Report details:', {\n            period: taxReport.data.report.period,\n            transactions: taxReport.data.report.transactions,\n            totalEarnings: taxReport.data.report.totalEarnings,\n            commissionPaid: taxReport.data.report.commissionPaid,\n            taxableIncome: taxReport.data.report.taxableIncome\n        });\n        \n        // Verify in database\n        const { data: storedReport } = await supabase\n            .from('tax_reports')\n            .select('*')\n            .eq('worker_id', workerId)\n            .eq('year', currentYear)\n            .eq('month', currentMonth)\n            .single();\n        \n        if (storedReport) {\n            console.log('✅ Tax report stored in database');\n            return true;\n        } else {\n            console.log('❌ Tax report not found in database');\n            return false;\n        }\n        \n    } catch (error) {\n        console.log('❌ Tax reporting test failed:', error.message);\n        return false;\n    }\n};\n\n// Test 7: Database Schema\nconst testDatabaseSchema = async () => {\n    console.log('\\n🗄️  Test 7: Phase 2 Database Schema');\n    \n    try {\n        const tables = [\n            'customer_insights',\n            'performance_metrics', \n            'recurring_tips',\n            'push_notifications',\n            'marketing_campaigns',\n            'customer_feedback',\n            'tax_reports',\n            'earnings_forecast'\n        ];\n        \n        for (const table of tables) {\n            const { data, error } = await supabase\n                .from(table)\n                .select('*')\n                .limit(1);\n            \n            if (error) {\n                console.log(`❌ Table ${table} not accessible:`, error.message);\n                return false;\n            } else {\n                console.log(`✅ Table ${table} exists and accessible`);\n            }\n        }\n        \n        // Test analytics view\n        const { data: analyticsView, error: viewError } = await supabase\n            .from('analytics_dashboard')\n            .select('*')\n            .limit(1);\n        \n        if (viewError) {\n            console.log('❌ Analytics dashboard view not accessible:', viewError.message);\n            return false;\n        } else {\n            console.log('✅ Analytics dashboard view exists and accessible');\n        }\n        \n        return true;\n        \n    } catch (error) {\n        console.log('❌ Database schema test failed:', error.message);\n        return false;\n    }\n};\n\n// Run all tests\nconst runAllTests = async () => {\n    console.log('Starting Phase 2 comprehensive testing...\\n');\n    \n    let testResults = {\n        analytics: false,\n        forecast: false,\n        recurringTips: false,\n        feedback: false,\n        campaigns: false,\n        taxReporting: false,\n        database: false\n    };\n    \n    try {\n        // Test database schema first\n        testResults.database = await testDatabaseSchema();\n        \n        if (testResults.database) {\n            // Test all Phase 2 features\n            testResults.analytics = await testAnalyticsDashboard();\n            testResults.forecast = await testEarningsForecast();\n            testResults.recurringTips = await testRecurringTips();\n            testResults.feedback = await testCustomerFeedback();\n            testResults.campaigns = await testMarketingCampaigns();\n            testResults.taxReporting = await testTaxReporting();\n        }\n        \n    } catch (error) {\n        console.log('\\n❌ Test suite failed:', error.message);\n    }\n    \n    // Print results\n    console.log('\\n' + '='.repeat(60));\n    console.log('🏁 PHASE 2 TEST RESULTS');\n    console.log('='.repeat(60));\n    \n    const tests = [\n        { name: 'Database Schema', result: testResults.database },\n        { name: 'Analytics Dashboard', result: testResults.analytics },\n        { name: 'Earnings Forecast', result: testResults.forecast },\n        { name: 'Recurring Tips', result: testResults.recurringTips },\n        { name: 'Customer Feedback', result: testResults.feedback },\n        { name: 'Marketing Campaigns', result: testResults.campaigns },\n        { name: 'Tax Reporting', result: testResults.taxReporting }\n    ];\n    \n    tests.forEach(test => {\n        const status = test.result ? '✅ PASS' : '❌ FAIL';\n        console.log(`${status} ${test.name}`);\n    });\n    \n    const passedTests = tests.filter(t => t.result).length;\n    const totalTests = tests.length;\n    \n    console.log('\\n📈 SUMMARY:');\n    console.log(`   Tests Passed: ${passedTests}/${totalTests}`);\n    console.log(`   Success Rate: ${Math.round(passedTests/totalTests*100)}%`);\n    \n    if (passedTests === totalTests) {\n        console.log('\\n🎉 ALL TESTS PASSED! Phase 2 is ready for production.');\n    } else {\n        console.log('\\n⚠️  Some tests failed. Please check the implementation.');\n    }\n    \n    console.log('\\n💡 Phase 2 Features Available:');\n    console.log('   📊 Analytics Dashboard: http://localhost:3000/analytics-dashboard.html');\n    console.log('   🔮 Earnings Forecasting: AI-powered predictions');\n    console.log('   🔄 Recurring Tips: Monthly appreciation system');\n    console.log('   💬 Customer Feedback: Service improvement insights');\n    console.log('   🎯 Marketing Campaigns: Promotional tools');\n    console.log('   📋 Tax Reporting: Automated compliance documents');\n};\n\n// Run tests\nrunAllTests().catch(console.error);"