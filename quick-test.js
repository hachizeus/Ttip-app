// Quick Phase 1 Test - Run this after starting the server
const API_BASE = 'http://localhost:3000';

async function quickTest() {
    console.log('🚀 Quick Phase 1 Test\n');
    
    const tests = [
        {
            name: 'Server Health',
            test: async () => {
                const res = await fetch(`${API_BASE}/health`);
                const data = await res.json();
                return data.status === 'OK';
            }
        },
        {
            name: 'Payment Page',
            test: async () => {
                const res = await fetch(`${API_BASE}/pay/WORKER001`);
                const html = await res.text();
                return html.includes('Send Tip');
            }
        },
        {
            name: 'QR Generation',
            test: async () => {
                const res = await fetch(`${API_BASE}/generate-qr`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workerId: 'WORKER001' })
                });
                const data = await res.json();
                return data.qrPngUrl && data.fallbackUrl;
            }
        },
        {
            name: 'Admin Dashboard',
            test: async () => {
                const res = await fetch(`${API_BASE}/admin/transactions`);
                const data = await res.json();
                return data.transactions !== undefined;
            }
        }
    ];
    
    let passed = 0;
    
    for (const test of tests) {
        try {
            const result = await test.test();
            if (result) {
                console.log(`✅ ${test.name}`);
                passed++;
            } else {
                console.log(`❌ ${test.name}`);
            }
        } catch (error) {
            console.log(`❌ ${test.name} - ${error.message}`);
        }
    }
    
    console.log(`\n📊 Results: ${passed}/${tests.length} tests passed`);
    
    if (passed === tests.length) {
        console.log('\n🎉 Phase 1 is working! Test these URLs:');
        console.log('• Payment: http://localhost:3000/pay/WORKER001');
        console.log('• Admin: http://localhost:3000/admin');
        console.log('• QR: http://localhost:3000/qr/WORKER001');
    } else {
        console.log('\n⚠️ Some tests failed. Make sure server is running: npm start');
    }
}

quickTest().catch(console.error);