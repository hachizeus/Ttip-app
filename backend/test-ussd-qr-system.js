import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

console.log('📱 Testing USSD & Offline QR Code System\n');

// Test 1: Generate USSD QR Code
async function testUSSDQRCode() {
    console.log('🔢 Test 1: USSD QR Code Generation');
    
    try {
        // Get a real worker
        const { data: worker } = await supabase
            .from('workers')
            .select('*')
            .limit(1)
            .single();
            
        if (!worker) throw new Error('No workers found');
        
        const ussdCode = `*334*1*${worker.worker_id}#`;
        const qrSvg = await QRCode.toString(ussdCode, { type: 'svg' });
        
        const { data: qrCode, error } = await supabase
            .from('ussd_qr_codes')
            .insert({
                worker_id: worker.id,
                qr_type: 'ussd',
                qr_content: ussdCode,
                qr_svg: qrSvg,
                instructions: {
                    title: 'USSD Payment',
                    steps: [
                        'Scan this QR code with your phone camera',
                        'Or dial: ' + ussdCode,
                        'Enter tip amount when prompted',
                        'Enter your M-Pesa PIN to confirm'
                    ],
                    note: 'Works on any phone - no internet required!'
                }
            })
            .select()
            .single();
            
        if (error) throw error;
        
        console.log('✅ USSD QR Code created:');
        console.log(`   Worker: ${worker.name}`);
        console.log(`   USSD Code: ${ussdCode}`);
        console.log(`   QR ID: ${qrCode.id}`);
        console.log(`   Instructions: ${qrCode.instructions.steps.length} steps\n`);
        
        return qrCode;
    } catch (error) {
        console.log(`❌ USSD QR test failed: ${error.message}\n`);
        return null;
    }
}

// Test 2: Generate PayBill QR Code
async function testPayBillQRCode() {
    console.log('🏪 Test 2: PayBill QR Code Generation');
    
    try {
        const { data: worker } = await supabase
            .from('workers')
            .select('*')
            .limit(1)
            .single();
            
        const paybillNumber = '174379'; // Your M-Pesa paybill
        const accountNumber = worker.worker_id;
        const qrContent = `paybill:${paybillNumber}:${accountNumber}`;
        const qrSvg = await QRCode.toString(qrContent, { type: 'svg' });
        
        const { data: qrCode, error } = await supabase
            .from('ussd_qr_codes')
            .insert({
                worker_id: worker.id,
                qr_type: 'paybill',
                qr_content: qrContent,
                qr_svg: qrSvg,
                instructions: {
                    title: 'PayBill Payment',
                    paybill_number: paybillNumber,
                    account_number: accountNumber,
                    steps: [
                        'Go to M-Pesa menu',
                        'Select "Lipa na M-Pesa"',
                        'Select "Pay Bill"',
                        `Enter Business Number: ${paybillNumber}`,
                        `Enter Account Number: ${accountNumber}`,
                        'Enter amount and PIN'
                    ],
                    qr_steps: [
                        'Scan QR code with M-Pesa app',
                        'Enter amount',
                        'Confirm with PIN'
                    ]
                }
            })
            .select()
            .single();
            
        if (error) throw error;
        
        console.log('✅ PayBill QR Code created:');
        console.log(`   PayBill: ${paybillNumber}`);
        console.log(`   Account: ${accountNumber}`);
        console.log(`   QR ID: ${qrCode.id}\n`);
        
        return qrCode;
    } catch (error) {
        console.log(`❌ PayBill QR test failed: ${error.message}\n`);
        return null;
    }
}

// Test 3: Generate Offline Instructions QR
async function testOfflineQRCode() {
    console.log('📴 Test 3: Offline Instructions QR Code');
    
    try {
        const { data: worker } = await supabase
            .from('workers')
            .select('*')
            .limit(1)
            .single();
            
        const offlineInstructions = {
            worker_name: worker.name,
            worker_phone: worker.phone,
            payment_methods: [
                {
                    method: 'M-Pesa Send Money',
                    phone: worker.phone,
                    steps: ['Go to M-Pesa', 'Send Money', `Send to ${worker.phone}`, 'Enter amount', 'Confirm with PIN']
                },
                {
                    method: 'Bank Transfer',
                    details: 'Ask worker for bank details',
                    reference: worker.worker_id
                },
                {
                    method: 'Cash',
                    note: 'Hand cash directly to worker'
                }
            ]
        };
        
        const qrContent = JSON.stringify(offlineInstructions);
        const qrSvg = await QRCode.toString(qrContent, { type: 'svg' });
        
        const { data: qrCode, error } = await supabase
            .from('ussd_qr_codes')
            .insert({
                worker_id: worker.id,
                qr_type: 'offline',
                qr_content: qrContent,
                qr_svg: qrSvg,
                instructions: {
                    title: 'Offline Payment Options',
                    worker_name: worker.name,
                    worker_phone: worker.phone,
                    methods: offlineInstructions.payment_methods,
                    note: 'Multiple ways to tip - choose what works for you!'
                }
            })
            .select()
            .single();
            
        if (error) throw error;
        
        console.log('✅ Offline QR Code created:');
        console.log(`   Worker: ${worker.name}`);
        console.log(`   Phone: ${worker.phone}`);
        console.log(`   Methods: ${offlineInstructions.payment_methods.length}`);
        console.log(`   QR ID: ${qrCode.id}\n`);
        
        return qrCode;
    } catch (error) {
        console.log(`❌ Offline QR test failed: ${error.message}\n`);
        return null;
    }
}

// Test 4: Test Payment Reconciliation
async function testPaymentReconciliation() {
    console.log('🔄 Test 4: Payment Reconciliation System');
    
    try {
        const { data: worker } = await supabase
            .from('workers')
            .select('*')
            .limit(1)
            .single();
            
        // Simulate M-Pesa transaction codes that need reconciliation
        const mpesaCodes = [
            'QGH7X8Y9Z1',
            'RFJ2K3L4M5',
            'STU6V7W8X9'
        ];
        
        const mappings = [];
        
        for (let i = 0; i < mpesaCodes.length; i++) {
            const { data: mapping, error } = await supabase
                .from('ussd_mappings')
                .insert({
                    mpesa_code: mpesaCodes[i],
                    worker_id: worker.id,
                    amount: (i + 1) * 50, // 50, 100, 150
                    phone_number: `+25470000000${i + 1}`,
                    reconciled: false
                })
                .select()
                .single();
                
            if (error) throw error;
            mappings.push(mapping);
        }
        
        console.log('✅ Payment mappings created:');
        mappings.forEach((mapping, i) => {
            console.log(`   ${mapping.mpesa_code}: KES ${mapping.amount} (${mapping.phone_number})`);
        });
        
        // Simulate reconciliation process
        const { data: reconciledMapping, error: reconError } = await supabase
            .from('ussd_mappings')
            .update({ reconciled: true })
            .eq('id', mappings[0].id)
            .select()
            .single();
            
        if (reconError) throw reconError;
        
        console.log(`✅ Reconciled: ${reconciledMapping.mpesa_code}\n`);
        
        return mappings;
    } catch (error) {
        console.log(`❌ Reconciliation test failed: ${error.message}\n`);
        return null;
    }
}

// Test 5: Generate All QR Types for Worker
async function generateWorkerQRCodes() {
    console.log('🎯 Test 5: Complete QR Code Suite for Worker');
    
    try {
        const { data: worker } = await supabase
            .from('workers')
            .select('*')
            .limit(1)
            .single();
            
        console.log(`📋 Generating all QR codes for: ${worker.name}\n`);
        
        // Standard STK Push QR (existing)
        const stkUrl = `https://ttip-backend.onrender.com/api/tip/${worker.worker_id}`;
        const stkQR = await QRCode.toString(stkUrl, { type: 'svg' });
        
        const { data: standardQR } = await supabase
            .from('ussd_qr_codes')
            .insert({
                worker_id: worker.id,
                qr_type: 'standard',
                qr_url: stkUrl,
                qr_svg: stkQR,
                instructions: {
                    title: 'Quick Tip (STK Push)',
                    steps: ['Scan QR code', 'Enter amount', 'Confirm on phone'],
                    note: 'Fastest method - requires internet'
                }
            })
            .select()
            .single();
            
        // Get all QR codes for this worker
        const { data: allQRs, error } = await supabase
            .from('ussd_qr_codes')
            .select('*')
            .eq('worker_id', worker.id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        console.log(`✅ Worker has ${allQRs.length} QR code types:`);
        allQRs.forEach(qr => {
            console.log(`   📱 ${qr.qr_type.toUpperCase()}: ${qr.instructions?.title || 'Payment Option'}`);
        });
        
        console.log('\n🎉 Complete payment ecosystem ready!\n');
        
        return allQRs;
    } catch (error) {
        console.log(`❌ QR suite generation failed: ${error.message}\n`);
        return null;
    }
}

// Test 6: Simulate Real-World Usage
async function simulateRealWorldUsage() {
    console.log('🌍 Test 6: Real-World Usage Simulation');
    
    try {
        console.log('📱 Customer scenarios:');
        console.log('   1. Smartphone user → STK Push QR');
        console.log('   2. Feature phone user → USSD QR');
        console.log('   3. No data user → PayBill QR');
        console.log('   4. No phone user → Offline QR');
        console.log('   5. Tourist/visitor → Multiple options QR\n');
        
        // Get unreconciled payments
        const { data: pending, error } = await supabase
            .from('ussd_mappings')
            .select('*')
            .eq('reconciled', false);
            
        if (error) throw error;
        
        console.log(`💰 Pending reconciliation: ${pending.length} payments`);
        if (pending.length > 0) {
            const totalPending = pending.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            console.log(`   Total amount: KES ${totalPending}`);
        }
        
        // Get QR code usage stats
        const { data: qrStats, error: qrError } = await supabase
            .from('ussd_qr_codes')
            .select('qr_type')
            .order('created_at', { ascending: false });
            
        if (qrError) throw qrError;
        
        const typeCount = qrStats.reduce((acc, qr) => {
            acc[qr.qr_type] = (acc[qr.qr_type] || 0) + 1;
            return acc;
        }, {});
        
        console.log('\n📊 QR Code Distribution:');
        Object.entries(typeCount).forEach(([type, count]) => {
            console.log(`   ${type.toUpperCase()}: ${count} codes`);
        });
        
        console.log('\n✅ Real-world simulation complete\n');
        
        return { pending, qrStats: typeCount };
    } catch (error) {
        console.log(`❌ Simulation failed: ${error.message}\n`);
        return null;
    }
}

// Run all tests
async function runUSSDTests() {
    console.log('🚀 Starting USSD & QR Code System Tests\n');
    
    const results = {
        ussdQR: await testUSSDQRCode(),
        paybillQR: await testPayBillQRCode(),
        offlineQR: await testOfflineQRCode(),
        reconciliation: await testPaymentReconciliation(),
        workerSuite: await generateWorkerQRCodes(),
        simulation: await simulateRealWorldUsage()
    };
    
    const passed = Object.values(results).filter(r => r !== null).length;
    const total = Object.keys(results).length;
    
    console.log('🎯 USSD & QR CODE TEST RESULTS:');
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`📊 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (passed === total) {
        console.log('\n🎉 ALL USSD & QR CODE TESTS PASSED!');
        console.log('📱 Your system now supports:');
        console.log('   • STK Push QR (smartphone users)');
        console.log('   • USSD QR (feature phone users)');
        console.log('   • PayBill QR (manual M-Pesa)');
        console.log('   • Offline QR (multiple payment methods)');
        console.log('   • Payment reconciliation system');
        console.log('\n🌍 Ready for ALL types of customers!');
    }
}

runUSSDTests().catch(console.error);