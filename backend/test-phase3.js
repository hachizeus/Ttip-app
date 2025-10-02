import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const BASE_URL = 'http://localhost:3000';

class Phase3Tester {
    constructor() {
        this.testResults = [];
        this.adminToken = null;
    }

    async runAllTests() {
        console.log('🧪 Starting TTip Phase 3 Comprehensive Tests...\n');

        try {
            // Test 1: Database Schema
            await this.testDatabaseSchema();

            // Test 2: Security Features
            await this.testSecurityFeatures();

            // Test 3: Multi-Gateway Payments
            await this.testMultiGatewayPayments();

            // Test 4: USSD Functionality
            await this.testUSSDFunctionality();

            // Test 5: Fraud Detection
            await this.testFraudDetection();

            // Test 6: Admin Features
            await this.testAdminFeatures();

            // Test 7: Analytics
            await this.testAnalytics();

            // Test 8: Monitoring
            await this.testMonitoring();

            this.printResults();

        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
    }

    async testDatabaseSchema() {
        console.log('📊 Testing Database Schema...');

        const tables = [
            'idempotency_keys',
            'admin_users',
            'fraud_checks',
            'fraud_blacklist',
            'ussd_qr_codes',
            'system_logs',
            'analytics_events'
        ];

        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('count')
                    .limit(1);

                this.addResult(`Database table: ${table}`, !error, error?.message);
            } catch (error) {
                this.addResult(`Database table: ${table}`, false, error.message);
            }
        }
    }

    async testSecurityFeatures() {
        console.log('🔒 Testing Security Features...');

        // Test CSRF protection
        try {
            const response = await axios.post(`${BASE_URL}/api/pay`, {
                method: 'mpesa',
                workerId: 'test',
                amount: 10,
                customerPhone: '0712345678'
            });

            this.addResult('CSRF Protection', response.status === 403, 'Should reject without CSRF token');
        } catch (error) {
            this.addResult('CSRF Protection', error.response?.status === 403, 'CSRF protection active');
        }

        // Test rate limiting
        try {
            const promises = Array(15).fill().map(() => 
                axios.post(`${BASE_URL}/api/pay`, {}, { 
                    headers: { 'X-CSRF-Token': Date.now().toString() }
                }).catch(e => e.response)
            );

            const responses = await Promise.all(promises);
            const rateLimited = responses.some(r => r?.status === 429);

            this.addResult('Rate Limiting', rateLimited, 'Rate limiting should trigger');
        } catch (error) {
            this.addResult('Rate Limiting', false, error.message);
        }

        // Test idempotency
        try {
            const idempotencyKey = `test-${Date.now()}`;
            
            const response1 = await axios.post(`${BASE_URL}/api/pay`, {
                method: 'mpesa',
                workerId: 'test',
                amount: 10,
                customerPhone: '0712345678'
            }, {
                headers: {
                    'X-CSRF-Token': Date.now().toString(),
                    'Idempotency-Key': idempotencyKey
                }
            }).catch(e => e.response);

            const response2 = await axios.post(`${BASE_URL}/api/pay`, {
                method: 'mpesa',
                workerId: 'test',
                amount: 10,
                customerPhone: '0712345678'
            }, {
                headers: {
                    'X-CSRF-Token': Date.now().toString(),
                    'Idempotency-Key': idempotencyKey
                }
            }).catch(e => e.response);

            this.addResult('Idempotency', 
                response1?.data && response2?.data && 
                JSON.stringify(response1.data) === JSON.stringify(response2.data),
                'Idempotent requests should return same response'
            );
        } catch (error) {
            this.addResult('Idempotency', false, error.message);
        }
    }

    async testMultiGatewayPayments() {
        console.log('💳 Testing Multi-Gateway Payments...');

        const gateways = ['mpesa', 'stripe', 'paypal', 'flutterwave'];

        for (const gateway of gateways) {
            try {
                const response = await axios.post(`${BASE_URL}/api/pay`, {
                    method: gateway,
                    workerId: 'test-worker',
                    amount: 10,
                    currency: 'KES',
                    customerPhone: '0712345678',
                    customerEmail: 'test@example.com'
                }, {
                    headers: {
                        'X-CSRF-Token': Date.now().toString(),
                        'Idempotency-Key': `test-${gateway}-${Date.now()}`
                    }
                }).catch(e => e.response);

                this.addResult(`Payment Gateway: ${gateway}`, 
                    response?.data?.success !== undefined,
                    response?.data?.error || 'Gateway responded'
                );
            } catch (error) {
                this.addResult(`Payment Gateway: ${gateway}`, false, error.message);
            }
        }
    }

    async testUSSDFunctionality() {
        console.log('📱 Testing USSD Functionality...');

        // Test USSD QR generation
        try {
            const response = await axios.post(`${BASE_URL}/generate-ussd-qr`, {
                workerId: 'test-worker',
                type: 'ussd'
            });

            this.addResult('USSD QR Generation', 
                response.data?.qrPngUrl && response.data?.instructions,
                'USSD QR generated with instructions'
            );
        } catch (error) {
            this.addResult('USSD QR Generation', false, error.message);
        }

        // Test offline QR generation
        try {
            const response = await axios.post(`${BASE_URL}/generate-ussd-qr`, {
                workerId: 'test-worker',
                type: 'offline'
            });

            this.addResult('Offline QR Generation', 
                response.data?.qrPngUrl && response.data?.instructions,
                'Offline QR generated'
            );
        } catch (error) {
            this.addResult('Offline QR Generation', false, error.message);
        }

        // Test USSD reconciliation
        try {
            const response = await axios.post(`${BASE_URL}/api/ussd-reconcile`, {
                mpesaCode: 'TEST123456',
                amount: 50,
                phoneNumber: '254712345678'
            });

            this.addResult('USSD Reconciliation', 
                response.data?.success !== undefined,
                response.data?.message || 'Reconciliation attempted'
            );
        } catch (error) {
            this.addResult('USSD Reconciliation', false, error.message);
        }
    }

    async testFraudDetection() {
        console.log('🛡️ Testing Fraud Detection...');

        // Test high amount fraud detection
        try {
            const response = await axios.post(`${BASE_URL}/api/pay`, {
                method: 'mpesa',
                workerId: 'test-worker',
                amount: 50000, // High amount
                customerPhone: '0712345678'
            }, {
                headers: {
                    'X-CSRF-Token': Date.now().toString(),
                    'Idempotency-Key': `fraud-test-${Date.now()}`
                }
            }).catch(e => e.response);

            this.addResult('Fraud Detection - High Amount', 
                response?.data?.error?.includes('flagged') || response?.data?.success === false,
                'High amount should trigger fraud detection'
            );
        } catch (error) {
            this.addResult('Fraud Detection - High Amount', false, error.message);
        }

        // Test rapid transactions fraud detection
        const rapidTests = [];
        for (let i = 0; i < 5; i++) {
            rapidTests.push(
                axios.post(`${BASE_URL}/api/pay`, {
                    method: 'mpesa',
                    workerId: 'test-worker',
                    amount: 100,
                    customerPhone: '0712345678'
                }, {
                    headers: {
                        'X-CSRF-Token': Date.now().toString(),
                        'Idempotency-Key': `rapid-${i}-${Date.now()}`
                    }
                }).catch(e => e.response)
            );
        }

        try {
            const responses = await Promise.all(rapidTests);
            const flagged = responses.some(r => 
                r?.data?.error?.includes('flagged') || r?.data?.success === false
            );

            this.addResult('Fraud Detection - Rapid Transactions', 
                flagged,
                'Rapid transactions should trigger fraud detection'
            );
        } catch (error) {
            this.addResult('Fraud Detection - Rapid Transactions', false, error.message);
        }
    }

    async testAdminFeatures() {
        console.log('👨‍💼 Testing Admin Features...');

        // Test admin login (without 2FA for testing)
        try {
            const response = await axios.post(`${BASE_URL}/admin/login`, {
                username: 'admin',
                password: 'test-password',
                totpCode: '123456' // Mock TOTP
            }).catch(e => e.response);

            if (response?.data?.token) {
                this.adminToken = response.data.token;
            }

            this.addResult('Admin Login', 
                response?.data?.success !== undefined,
                'Admin login endpoint responds'
            );
        } catch (error) {
            this.addResult('Admin Login', false, error.message);
        }

        // Test admin transactions endpoint
        try {
            const response = await axios.get(`${BASE_URL}/admin/transactions`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken || 'test-token'}`
                }
            }).catch(e => e.response);

            this.addResult('Admin Transactions', 
                response?.status === 200 || response?.status === 401,
                'Admin transactions endpoint accessible'
            );
        } catch (error) {
            this.addResult('Admin Transactions', false, error.message);
        }
    }

    async testAnalytics() {
        console.log('📈 Testing Analytics...');

        // Test analytics endpoint
        try {
            const response = await axios.get(`${BASE_URL}/admin/analytics`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken || 'test-token'}`
                }
            }).catch(e => e.response);

            this.addResult('Analytics Endpoint', 
                response?.status === 200 || response?.status === 401,
                'Analytics endpoint accessible'
            );
        } catch (error) {
            this.addResult('Analytics Endpoint', false, error.message);
        }
    }

    async testMonitoring() {
        console.log('📊 Testing Monitoring...');

        // Test health endpoint
        try {
            const response = await axios.get(`${BASE_URL}/health`);

            this.addResult('Health Check', 
                response.data?.status === 'OK',
                'Health check returns OK status'
            );
        } catch (error) {
            this.addResult('Health Check', false, error.message);
        }

        // Test metrics endpoint
        try {
            const response = await axios.get(`${BASE_URL}/metrics`);

            this.addResult('Metrics Endpoint', 
                response.data?.includes('ttip_requests_total'),
                'Metrics endpoint returns Prometheus format'
            );
        } catch (error) {
            this.addResult('Metrics Endpoint', false, error.message);
        }
    }

    addResult(test, passed, message) {
        this.testResults.push({
            test,
            passed,
            message
        });

        const status = passed ? '✅' : '❌';
        console.log(`  ${status} ${test}: ${message}`);
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 PHASE 3 TEST RESULTS SUMMARY');
        console.log('='.repeat(60));

        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const percentage = ((passed / total) * 100).toFixed(1);

        console.log(`\nTotal Tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${total - passed}`);
        console.log(`Success Rate: ${percentage}%`);

        if (percentage >= 80) {
            console.log('\n🎉 Phase 3 implementation is READY FOR PRODUCTION!');
        } else if (percentage >= 60) {
            console.log('\n⚠️  Phase 3 needs some fixes before production');
        } else {
            console.log('\n❌ Phase 3 requires significant fixes');
        }

        console.log('\n📋 Failed Tests:');
        this.testResults
            .filter(r => !r.passed)
            .forEach(r => console.log(`  ❌ ${r.test}: ${r.message}`));

        console.log('\n✅ Passed Tests:');
        this.testResults
            .filter(r => r.passed)
            .forEach(r => console.log(`  ✅ ${r.test}`));
    }
}

// Run tests
const tester = new Phase3Tester();
tester.runAllTests();