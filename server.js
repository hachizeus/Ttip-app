import express, { json } from 'express';
import cors from 'cors';
import { configDotenv } from 'dotenv'
import { initiateMpesaPayment, queryPaymentStatus } from './daraja.mjs';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from './sms.mjs';
configDotenv('./.env')

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const app = express();
app.use(json());
app.use(cors());

// In-memory storage for payment requests (use database in production)
const paymentRequests = new Map();

// Phase 2: Milestone thresholds
const MILESTONES = {
    FIRST_TIP: { threshold: 1, badge: '🎉 First Tip!' },
    RISING_STAR: { threshold: 100, badge: '⭐ Rising Star' },
    TIP_CHAMPION: { threshold: 500, badge: '🏆 Tip Champion' },
    TIP_LEGEND: { threshold: 1000, badge: '👑 Tip Legend' }
};

// Phase 2: Auto-generate review after tip
async function generateAutoReview(workerID, amount) {
    const reviews = [
        'Great service, very professional!',
        'Excellent work, highly recommended!',
        'Amazing service, will definitely tip again!',
        'Outstanding performance, keep it up!',
        'Fantastic service, very satisfied!'
    ];
    
    const rating = amount >= 100 ? 5 : amount >= 50 ? 4 : 3;
    const review = reviews[Math.floor(Math.random() * reviews.length)];
    
    await supabase.from('reviews').insert({
        worker_id: workerID,
        rating,
        review_text: review,
        is_auto_generated: true
    });
}

// Phase 2: Check and award milestones
async function checkMilestones(workerID) {
    const { data: stats } = await supabase
        .from('transactions')
        .select('amount')
        .eq('worker_id', workerID)
        .eq('status', 'completed');
    
    const totalTips = stats?.reduce((sum, t) => sum + t.amount, 0) || 0;
    
    for (const [key, milestone] of Object.entries(MILESTONES)) {
        if (totalTips >= milestone.threshold) {
            const { data: existing } = await supabase
                .from('milestones')
                .select('id')
                .eq('worker_id', workerID)
                .eq('milestone_type', key)
                .single();
            
            if (!existing) {
                await supabase.from('milestones').insert({
                    worker_id: workerID,
                    milestone_type: key,
                    badge_text: milestone.badge,
                    achieved_at: new Date().toISOString()
                });
                
                // Send milestone notification
                const { data: worker } = await supabase
                    .from('workers')
                    .select('phone')
                    .eq('worker_id', workerID)
                    .single();
                
                if (worker?.phone) {
                    await sendSMS(worker.phone, `🎉 Congratulations! You've earned: ${milestone.badge}`);
                }
            }
        }
    }
}

app.post('/api/pay', async (req, res) => {
    const { phone, amount, workerID } = req.body;

    try {
        const response = await initiateMpesaPayment(phone, amount);
        
        // Store payment request for status tracking
        if (response.CheckoutRequestID) {
            paymentRequests.set(response.CheckoutRequestID, {
                status: 'PENDING',
                phone,
                amount,
                workerID,
                timestamp: new Date().toISOString()
            });
            
            // Store in database
            await supabase.from('transactions').insert({
                checkout_request_id: response.CheckoutRequestID,
                worker_id: workerID,
                customer_phone: phone,
                amount,
                status: 'pending'
            });
        }
        
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/payment-status', async (req, res) => {
    const { CheckoutRequestID } = req.body;

    try {
        // Check if we have this payment request
        const paymentRequest = paymentRequests.get(CheckoutRequestID);
        if (!paymentRequest) {
            return res.json({ status: 'NOT_FOUND' });
        }

        // Query M-Pesa for current status
        const statusResponse = await queryPaymentStatus(CheckoutRequestID);
        
        // Update stored status
        paymentRequest.status = statusResponse.status;
        paymentRequests.set(CheckoutRequestID, paymentRequest);
        
        res.json({ status: statusResponse.status });
    } catch (error) {
        res.status(500).json({ error: error.message, status: 'ERROR' });
    }
});

// Subscription payment endpoint
app.post('/api/subscription-payment', async (req, res) => {
    const { phone, amount, plan } = req.body;
    
    try {
        const response = await initiateMpesaPayment(phone, amount);
        
        if (response.ResponseCode === '0') {
            paymentRequests.set(response.CheckoutRequestID, {
                status: 'PENDING',
                phone,
                amount,
                plan,
                type: 'subscription',
                timestamp: new Date().toISOString()
            });
            
            res.json({
                success: true,
                checkoutRequestID: response.CheckoutRequestID,
                message: 'Payment initiated successfully'
            });
        } else {
            res.json({
                success: false,
                error: response.ResponseDescription || 'Payment failed'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Subscription status endpoint with M-Pesa query
app.get('/api/subscription-status/:checkoutID', async (req, res) => {
    try {
        const { checkoutID } = req.params;
        const paymentRequest = paymentRequests.get(checkoutID);
        
        if (!paymentRequest) {
            return res.json({ status: 'not_found' });
        }
        
        // If still pending, query M-Pesa directly
        if (paymentRequest.status === 'PENDING') {
            try {
                const statusResponse = await queryPaymentStatus(checkoutID);
                if (statusResponse.status === 'SUCCESS') {
                    paymentRequest.status = 'SUCCESS';
                    paymentRequests.set(checkoutID, paymentRequest);
                } else if (statusResponse.status === 'FAILED') {
                    paymentRequest.status = 'FAILED';
                    paymentRequests.set(checkoutID, paymentRequest);
                }
            } catch (queryError) {
                console.log('Query error:', queryError);
            }
        }
        
        res.json({ status: paymentRequest.status.toLowerCase() });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

// Tip page endpoint
app.get('/tip/:workerID', async (req, res) => {
    try {
        const { workerID } = req.params;
        
        console.log('Looking for worker with ID:', workerID);
        
        // Fetch worker from database
        const { data: worker, error } = await supabase
            .from('workers')
            .select('name, occupation, worker_id')
            .eq('worker_id', workerID)
            .single();
        
        console.log('Worker query result:', { worker, error });
        
        if (error || !worker) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Worker Not Found</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                            .container { max-width: 400px; margin: 0 auto; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>Worker Not Found</h1>
                            <p>The worker with ID <strong>${workerID}</strong> does not exist in our database.</p>
                            <p>Please ask the worker to generate a new QR code.</p>
                        </div>
                    </body>
                </html>
            `);
        }
        
        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Tip ${worker.name}</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                        .container { max-width: 400px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
                        .worker-info { text-align: center; margin-bottom: 20px; }
                        .worker-name { font-size: 24px; font-weight: bold; color: #0052CC; }
                        .worker-occupation { color: #666; margin: 5px 0; }
                        .rating-section { margin: 15px 0; text-align: center; }
                        .stars { font-size: 24px; margin: 10px 0; }
                        .star { cursor: pointer; color: #ddd; transition: color 0.2s; }
                        .star.active { color: #ffd700; }
                        input, textarea, button { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; }
                        textarea { resize: vertical; height: 80px; }
                        button { background: #0052CC; color: white; border: none; cursor: pointer; }
                        button:hover { background: #003d99; }
                        .success-message { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 10px 0; display: none; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="worker-info">
                            <div class="worker-name">${worker.name}</div>
                            <div class="worker-occupation">${worker.occupation}</div>
                        </div>
                        <input type="number" id="amount" placeholder="Enter tip amount (KSh)" min="1">
                        <input type="tel" id="phone" placeholder="Your phone number (254...)">
                        
                        <div class="rating-section">
                            <div>Rate this service:</div>
                            <div class="stars" id="stars">
                                <span class="star" data-rating="1">★</span>
                                <span class="star" data-rating="2">★</span>
                                <span class="star" data-rating="3">★</span>
                                <span class="star" data-rating="4">★</span>
                                <span class="star" data-rating="5">★</span>
                            </div>
                            <textarea id="review" placeholder="Leave a review (optional)"></textarea>
                        </div>
                        
                        <button onclick="sendTip()">Send Tip & Review</button>
                        <div class="success-message" id="successMessage"></div>
                    </div>
                    <script>
                        let selectedRating = 0;
                        
                        // Star rating functionality
                        document.querySelectorAll('.star').forEach(star => {
                            star.addEventListener('click', function() {
                                selectedRating = parseInt(this.dataset.rating);
                                updateStars();
                            });
                        });
                        
                        function updateStars() {
                            document.querySelectorAll('.star').forEach((star, index) => {
                                star.classList.toggle('active', index < selectedRating);
                            });
                        }
                        
                        async function sendTip() {
                            const amount = document.getElementById('amount').value;
                            const phone = document.getElementById('phone').value;
                            const review = document.getElementById('review').value;
                            
                            if (!amount || !phone) {
                                alert('Please enter amount and phone number');
                                return;
                            }
                            
                            try {
                                // Send payment
                                const payResponse = await fetch('/api/pay', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                        phone, 
                                        amount: parseInt(amount),
                                        workerID: '${workerID}'
                                    })
                                });
                                
                                const payResult = await payResponse.json();
                                
                                if (payResult.ResponseCode === '0') {
                                    // Send review if provided
                                    if (selectedRating > 0 || review.trim()) {
                                        await fetch('/api/reviews', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                workerID: '${workerID}',
                                                rating: selectedRating || 5,
                                                reviewText: review || 'Great service!',
                                                customerPhone: phone
                                            })
                                        });
                                    }
                                    
                                    document.getElementById('successMessage').innerHTML = 
                                        '✅ Payment request sent! Check your phone.<br>Thank you for your review!';
                                    document.getElementById('successMessage').style.display = 'block';
                                } else {
                                    alert('Payment failed: ' + payResult.ResponseDescription);
                                }
                            } catch (error) {
                                alert('Error: ' + error.message);
                            }
                        }
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Auto-expire pending payments after 2 minutes
setInterval(() => {
    const now = new Date();
    for (const [checkoutID, payment] of paymentRequests.entries()) {
        if (payment.status === 'PENDING') {
            const paymentTime = new Date(payment.timestamp);
            const timeDiff = (now.getTime() - paymentTime.getTime()) / 1000;
            
            // Auto-expire after 2 minutes
            if (timeDiff > 120) {
                payment.status = 'FAILED';
                paymentRequests.set(checkoutID, payment);
            }
        }
    }
}, 30000); // Check every 30 seconds

// Phase 2: Reviews endpoints
app.post('/api/reviews', async (req, res) => {
    const { workerID, rating, reviewText, customerPhone } = req.body;
    
    try {
        await supabase.from('reviews').insert({
            worker_id: workerID,
            rating,
            review_text: reviewText,
            customer_phone: customerPhone,
            is_auto_generated: false
        });
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reviews/:workerID', async (req, res) => {
    try {
        const { data: reviews } = await supabase
            .from('reviews')
            .select('*')
            .eq('worker_id', req.params.workerID)
            .order('created_at', { ascending: false });
        
        res.json(reviews || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Phase 2: Teams endpoints
app.post('/api/teams', async (req, res) => {
    const { teamName, managerPhone, workerPhones } = req.body;
    
    try {
        const { data: team } = await supabase
            .from('teams')
            .insert({ team_name: teamName, manager_phone: managerPhone })
            .select()
            .single();
        
        // Send invites to workers
        for (const phone of workerPhones) {
            await sendSMS(phone, `You've been invited to join team "${teamName}". Reply YES to accept.`);
        }
        
        res.json({ success: true, teamId: team.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/teams/:teamId/stats', async (req, res) => {
    try {
        const { data: members } = await supabase
            .from('workers')
            .select('worker_id')
            .eq('team_id', req.params.teamId);
        
        const workerIds = members?.map(m => m.worker_id) || [];
        
        const { data: transactions } = await supabase
            .from('transactions')
            .select('amount')
            .in('worker_id', workerIds)
            .eq('status', 'completed');
        
        const totalTips = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
        
        res.json({ totalTips, memberCount: workerIds.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Callback endpoint for M-Pesa notifications
app.post('/api/callback', async (req, res) => {
    console.log('M-Pesa callback received:', JSON.stringify(req.body, null, 2));
    
    try {
        const { CheckoutRequestID, ResultCode } = req.body.Body.stkCallback;
        
        const paymentRequest = paymentRequests.get(CheckoutRequestID);
        if (paymentRequest) {
            if (ResultCode === 0) {
                paymentRequest.status = 'SUCCESS';
                
                // Update database
                await supabase
                    .from('transactions')
                    .update({ status: 'completed' })
                    .eq('checkout_request_id', CheckoutRequestID);
                
                // Phase 2: Generate auto-review and check milestones
                if (paymentRequest.workerID) {
                    await generateAutoReview(paymentRequest.workerID, paymentRequest.amount);
                    await checkMilestones(paymentRequest.workerID);
                }
                
                console.log(`Payment ${CheckoutRequestID} marked as SUCCESS`);
            } else {
                paymentRequest.status = 'FAILED';
                
                await supabase
                    .from('transactions')
                    .update({ status: 'failed' })
                    .eq('checkout_request_id', CheckoutRequestID);
                
                console.log(`Payment ${CheckoutRequestID} marked as FAILED with code ${ResultCode}`);
            }
            paymentRequests.set(CheckoutRequestID, paymentRequest);
        } else {
            console.log(`Payment request ${CheckoutRequestID} not found in memory`);
        }
    } catch (error) {
        console.error('Callback processing error:', error);
    }
    
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
