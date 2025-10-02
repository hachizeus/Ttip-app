import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export class USSDService {
    constructor() {
        this.paybillNumber = process.env.SHORT_CODE || '174379';
        this.ussdCode = '*384*55#'; // Example USSD code
    }

    async generateUSSDQR(workerId, type = 'standard') {
        try {
            let qrContent;
            let instructions;

            switch (type) {
                case 'ussd':
                    // USSD-only QR code
                    qrContent = `tel:${this.ussdCode}`;
                    instructions = [
                        `Dial ${this.ussdCode}`,
                        'Select "Pay Bill"',
                        `Enter Business Number: ${this.paybillNumber}`,
                        `Enter Account Number: ${workerId}`,
                        'Enter Amount',
                        'Enter PIN to confirm'
                    ];
                    break;

                case 'paybill':
                    // M-Pesa Paybill instructions
                    qrContent = `mpesa://paybill?businessNumber=${this.paybillNumber}&accountNumber=${workerId}`;
                    instructions = [
                        'Go to M-Pesa menu',
                        'Select "Lipa na M-Pesa"',
                        'Select "Pay Bill"',
                        `Enter Business Number: ${this.paybillNumber}`,
                        `Enter Account Number: ${workerId}`,
                        'Enter Amount',
                        'Enter PIN to confirm'
                    ];
                    break;

                case 'offline':
                    // Offline-friendly QR with embedded instructions
                    qrContent = JSON.stringify({
                        type: 'ttip_offline',
                        workerId: workerId,
                        paybill: this.paybillNumber,
                        ussd: this.ussdCode,
                        instructions: `Dial ${this.ussdCode} or use M-Pesa PayBill ${this.paybillNumber}, Account: ${workerId}`
                    });
                    instructions = [
                        'OFFLINE PAYMENT OPTIONS:',
                        '',
                        'Option 1 - USSD:',
                        `Dial ${this.ussdCode}`,
                        'Follow prompts for PayBill',
                        '',
                        'Option 2 - M-Pesa Menu:',
                        'M-Pesa > Lipa na M-Pesa > Pay Bill',
                        `Business: ${this.paybillNumber}`,
                        `Account: ${workerId}`
                    ];
                    break;

                default:
                    // Standard QR with fallback
                    const fallbackUrl = `${process.env.BACKEND_URL || 'https://ttip-app.onrender.com'}/pay/${workerId}`;
                    qrContent = `${qrContent}|${fallbackUrl}`;
                    instructions = [
                        'Scan QR code with any QR scanner',
                        'Or manually:',
                        `Visit: ${fallbackUrl}`,
                        `Or PayBill: ${this.paybillNumber}`,
                        `Account: ${workerId}`
                    ];
            }

            // Generate QR code
            const qrPng = await QRCode.toDataURL(qrContent, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            const qrSvg = await QRCode.toString(qrContent, {
                type: 'svg',
                width: 300,
                margin: 2
            });

            // Upload to Supabase Storage
            const pngBuffer = Buffer.from(qrPng.split(',')[1], 'base64');
            const fileName = `${workerId}_${type}_${Date.now()}.png`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('qr_codes')
                .upload(fileName, pngBuffer, {
                    contentType: 'image/png',
                    upsert: true
                });

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('qr_codes')
                .getPublicUrl(fileName);

            // Save to database
            await supabase
                .from('ussd_qr_codes')
                .upsert({
                    worker_id: workerId,
                    qr_type: type,
                    qr_url: publicUrl,
                    qr_svg: qrSvg,
                    qr_content: qrContent,
                    instructions: instructions,
                    created_at: new Date().toISOString()
                });

            return {
                qrPngUrl: publicUrl,
                qrSvgUrl: publicUrl,
                qrContent: qrContent,
                instructions: instructions,
                type: type,
                paybillNumber: this.paybillNumber,
                accountNumber: workerId,
                ussdCode: this.ussdCode
            };

        } catch (error) {
            console.error('USSD QR generation error:', error);
            throw error;
        }
    }

    async reconcileUSSDPayment(mpesaCode, amount, phoneNumber) {
        try {
            console.log('=== USSD RECONCILIATION START ===');
            console.log('M-Pesa Code:', mpesaCode);
            console.log('Amount:', amount);
            console.log('Phone:', phoneNumber);

            // Extract worker ID from M-Pesa transaction details
            // This would typically involve calling M-Pesa API to get transaction details
            const transactionDetails = await this.getMpesaTransactionDetails(mpesaCode);

            if (!transactionDetails) {
                return {
                    success: false,
                    error: 'Could not retrieve transaction details'
                };
            }

            const workerId = transactionDetails.accountNumber;
            
            // Verify worker exists
            const { data: worker, error: workerError } = await supabase
                .from('workers')
                .select('worker_id, name, phone')
                .eq('worker_id', workerId)
                .single();

            if (workerError || !worker) {
                return {
                    success: false,
                    error: 'Worker not found'
                };
            }

            // Check if transaction already exists
            const { data: existingTx } = await supabase
                .from('transactions')
                .select('id')
                .eq('mpesa_tx_id', mpesaCode)
                .single();

            if (existingTx) {
                return {
                    success: false,
                    error: 'Transaction already processed'
                };
            }

            // Create transaction record
            const { data: transaction, error: txError } = await supabase
                .from('transactions')
                .insert({
                    worker_id: workerId,
                    customer_number: phoneNumber,
                    amount: amount,
                    status: 'COMPLETED',
                    gateway: 'mpesa_ussd',
                    mpesa_tx_id: mpesaCode,
                    raw_payload: {
                        reconciled: true,
                        mpesaCode: mpesaCode,
                        transactionDetails: transactionDetails
                    }
                })
                .select()
                .single();

            if (txError) {
                console.error('Transaction creation error:', txError);
                return {
                    success: false,
                    error: 'Failed to create transaction record'
                };
            }

            // Queue payout
            const { enqueuePayout } = await import('../payment-queue.js');
            await enqueuePayout(transaction.id, workerId, amount, phoneNumber);

            console.log('USSD reconciliation successful:', transaction.id);

            return {
                success: true,
                transactionId: transaction.id,
                workerId: workerId,
                workerName: worker.name,
                amount: amount,
                message: 'Payment reconciled and payout queued'
            };

        } catch (error) {
            console.error('USSD reconciliation error:', error);
            return {
                success: false,
                error: 'Reconciliation failed'
            };
        }
    }

    async getMpesaTransactionDetails(mpesaCode) {
        // In a real implementation, this would call M-Pesa API
        // to get transaction details using the transaction code
        
        // For now, we'll simulate this by parsing the code
        // M-Pesa codes typically contain encoded information
        
        try {
            // This is a simplified simulation
            // Real implementation would use M-Pesa Transaction Status API
            
            // For demo purposes, assume the account number is embedded
            // or we have a mapping table
            
            const { data: mapping } = await supabase
                .from('ussd_mappings')
                .select('worker_id, amount')
                .eq('mpesa_code', mpesaCode)
                .single();

            if (mapping) {
                return {
                    accountNumber: mapping.worker_id,
                    amount: mapping.amount,
                    businessNumber: this.paybillNumber
                };
            }

            // Fallback: try to extract from recent transactions
            // This is not ideal but works for demo
            return null;

        } catch (error) {
            console.error('Error getting M-Pesa details:', error);
            return null;
        }
    }

    // Generate printable USSD instructions
    async generatePrintableInstructions(workerId) {
        try {
            const { data: worker } = await supabase
                .from('workers')
                .select('name, occupation')
                .eq('worker_id', workerId)
                .single();

            const instructions = {
                workerName: worker?.name || 'Worker',
                workerOccupation: worker?.occupation || 'Service Worker',
                workerId: workerId,
                paybillNumber: this.paybillNumber,
                ussdCode: this.ussdCode,
                steps: [
                    {
                        method: 'USSD',
                        steps: [
                            `Dial ${this.ussdCode}`,
                            'Select "Pay Bill"',
                            `Business Number: ${this.paybillNumber}`,
                            `Account Number: ${workerId}`,
                            'Enter tip amount',
                            'Enter M-Pesa PIN'
                        ]
                    },
                    {
                        method: 'M-Pesa Menu',
                        steps: [
                            'Open M-Pesa app/menu',
                            'Select "Lipa na M-Pesa"',
                            'Select "Pay Bill"',
                            `Business Number: ${this.paybillNumber}`,
                            `Account Number: ${workerId}`,
                            'Enter tip amount',
                            'Enter M-Pesa PIN'
                        ]
                    }
                ],
                qrFallback: `${process.env.BACKEND_URL || 'https://ttip-app.onrender.com'}/pay/${workerId}`
            };

            return instructions;

        } catch (error) {
            console.error('Error generating printable instructions:', error);
            throw error;
        }
    }

    // Batch reconciliation for offline payments
    async batchReconcilePayments(payments) {
        const results = [];

        for (const payment of payments) {
            try {
                const result = await this.reconcileUSSDPayment(
                    payment.mpesaCode,
                    payment.amount,
                    payment.phoneNumber
                );
                
                results.push({
                    mpesaCode: payment.mpesaCode,
                    ...result
                });

                // Small delay to avoid overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                results.push({
                    mpesaCode: payment.mpesaCode,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            total: payments.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results: results
        };
    }
}