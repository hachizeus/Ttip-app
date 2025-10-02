import { createClient } from '@supabase/supabase-js';
import { initiateB2CPayment } from './enhanced-daraja.mjs';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Simple in-memory queue for MVP (use Redis/BullMQ in production)
const payoutQueue = [];
let isProcessing = false;

export const enqueuePayout = async (transactionId, workerId, amount, customerNumber) => {
    const payoutJob = {
        id: Date.now().toString(),
        transactionId,
        workerId,
        amount,
        customerNumber,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString()
    };
    
    payoutQueue.push(payoutJob);
    console.log(`Payout job enqueued: ${payoutJob.id} for worker ${workerId}`);
    
    // Start processing if not already running
    if (!isProcessing) {
        processPayoutQueue();
    }
    
    return payoutJob.id;
};

const processPayoutQueue = async () => {
    if (isProcessing || payoutQueue.length === 0) return;
    
    isProcessing = true;
    console.log(`Processing payout queue: ${payoutQueue.length} jobs`);
    
    while (payoutQueue.length > 0) {
        const job = payoutQueue.shift();
        await processPayoutJob(job);
        
        // Small delay between jobs
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    isProcessing = false;
};

const processPayoutJob = async (job) => {
    try {
        console.log(`Processing payout job: ${job.id}`);
        
        // Get worker details
        const { data: worker, error: workerError } = await supabase
            .from('workers')
            .select('phone, name')
            .eq('worker_id', job.workerId)
            .single();
        
        if (workerError || !worker) {
            throw new Error(`Worker not found: ${job.workerId}`);
        }
        
        // Create payout record
        const { data: payoutRecord, error: payoutError } = await supabase
            .from('payouts')
            .insert({
                tx_id: job.transactionId,
                worker_id: job.workerId,
                amount: job.amount,
                status: 'PENDING'
            })
            .select()
            .single();
        
        if (payoutError) {
            throw new Error(`Failed to create payout record: ${payoutError.message}`);
        }
        
        // Initiate B2C payment
        const b2cResponse = await initiateB2CPayment(
            worker.phone,
            job.amount,
            `Tip payout for ${worker.name}`
        );
        
        // Update payout record with response
        await supabase
            .from('payouts')
            .update({
                status: 'SUCCESS',
                daraja_response: b2cResponse,
                updated_at: new Date().toISOString()
            })
            .eq('id', payoutRecord.id);
        
        // Update transaction status
        await supabase
            .from('transactions')
            .update({
                status: 'COMPLETED',
                updated_at: new Date().toISOString()
            })
            .eq('id', job.transactionId);
        
        console.log(`Payout job completed: ${job.id}`);
        
    } catch (error) {
        console.error(`Payout job failed: ${job.id}`, error);
        
        job.attempts++;
        
        // Update payout record as failed
        await supabase
            .from('payouts')
            .update({
                status: 'FAILED',
                daraja_response: { error: error.message },
                updated_at: new Date().toISOString()
            })
            .eq('tx_id', job.transactionId);
        
        // Update transaction status as failed if max attempts reached
        if (job.attempts >= job.maxAttempts) {
            await supabase
                .from('transactions')
                .update({
                    status: 'FAILED',
                    updated_at: new Date().toISOString()
                })
                .eq('id', job.transactionId);
            
            console.log(`Payout job permanently failed: ${job.id}`);
        } else {
            // Re-queue for retry
            payoutQueue.push(job);
            console.log(`Payout job re-queued for retry: ${job.id} (attempt ${job.attempts})`);
        }
    }
};

export const getQueueStatus = () => {
    return {
        queueLength: payoutQueue.length,
        isProcessing,
        jobs: payoutQueue.map(job => ({
            id: job.id,
            workerId: job.workerId,
            amount: job.amount,
            attempts: job.attempts
        }))
    };
};