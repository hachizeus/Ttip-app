import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Test tip route
app.get('/tip/:workerId', (req, res) => {
    res.redirect(`/pay/${req.params.workerId}`);
});

// Improved payment page
app.get('/pay/:workerId', async (req, res) => {
    const { workerId } = req.params;
    
    try {
        const { data: worker } = await supabase
            .from('workers')
            .select('name, occupation, average_rating, review_count')
            .eq('worker_id', workerId)
            .single();
        
        if (!worker) {
            return res.status(404).send('Worker not found');
        }
        
        const workerName = worker.name || 'Worker';
        const workerOccupation = worker.occupation || 'Service Worker';
        const rating = worker.average_rating || 0;
        const reviewCount = worker.review_count || 0;
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Tip ${workerName} - TTip</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
                    .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
                    .header { text-align: center; margin-bottom: 30px; }
                    .worker-info { background: #f8f9fa; padding: 20px; border-radius: 15px; margin-bottom: 20px; text-align: center; }
                    .worker-name { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 5px; }
                    .worker-occupation { color: #666; font-size: 16px; margin-bottom: 10px; }
                    .rating { color: #ffa500; font-size: 18px; }
                    .input-group { position: relative; margin: 15px 0; }
                    .input-icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); font-size: 18px; color: #667eea; }
                    input { width: 100%; padding: 18px; margin: 12px 0; border: 2px solid #e9ecef; border-radius: 15px; font-size: 16px; box-sizing: border-box; transition: all 0.3s ease; }
                    .input-with-icon { padding-left: 50px; }
                    input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); transform: translateY(-1px); }
                    input::placeholder { color: #adb5bd; }
                    .pay-btn { width: 100%; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 15px; font-size: 18px; font-weight: bold; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); }
                    .pay-btn:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); }
                    .pay-btn:disabled { opacity: 0.7; transform: none; cursor: not-allowed; }
                    .message { margin-top: 20px; padding: 20px; border-radius: 15px; text-align: center; font-size: 16px; line-height: 1.5; }
                    .success { background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); color: #155724; border: 2px solid #28a745; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.2); }
                    .error { background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); color: #721c24; border: 2px solid #dc3545; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.2); }
                    .loading { background: linear-gradient(135deg, #e2e3e5 0%, #d6d8db 100%); color: #383d41; border: 2px solid #6c757d; }
                    .security-info { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 15px; text-align: center; }
                    .spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="color: #667eea; margin: 0;">⚡ TTip</h1>
                        <p style="color: #666; margin: 5px 0 0 0;">Send a tip with love</p>
                    </div>
                    
                    <div class="worker-info">
                        <div class="worker-name">${workerName}</div>
                        <div class="worker-occupation">${workerOccupation}</div>
                        <div class="rating">
                            ${'★'.repeat(Math.floor(rating))}${'☆'.repeat(5-Math.floor(rating))}
                            ${rating.toFixed(1)} (${reviewCount} reviews)
                        </div>
                    </div>
                    
                    <form id="paymentForm">
                        <div class="input-group">
                            <span class="input-icon">💰</span>
                            <input type="number" id="amount" name="amount" class="input-with-icon" placeholder="How much would you like to tip?" min="1" max="70000" required>
                        </div>
                        
                        <div class="input-group">
                            <span class="input-icon">📱</span>
                            <input type="tel" id="phone" name="phone" class="input-with-icon" placeholder="Your M-Pesa number (0712345678)" required>
                        </div>
                        
                        <button type="submit" class="pay-btn" id="payBtn">
                            🎁 Send Tip with Love
                        </button>
                    </form>
                    
                    <div id="message"></div>
                    
                    <div class="security-info">
                        <div style="font-size: 14px; color: #666; margin-bottom: 10px;">
                            🔒 Secure payment powered by M-Pesa
                        </div>
                        <div style="font-size: 12px; color: #999;">
                            Your payment is processed securely through Safaricom M-Pesa
                        </div>
                    </div>
                </div>
                
                <script>
                    // Phone number formatting
                    document.getElementById('phone').addEventListener('input', (e) => {
                        let value = e.target.value.replace(/\\D/g, '');
                        if (value.startsWith('254')) {
                            value = '0' + value.substring(3);
                        }
                        if (value.length > 10) {
                            value = value.substring(0, 10);
                        }
                        e.target.value = value;
                    });
                    
                    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        const amount = document.getElementById('amount').value;
                        const phone = document.getElementById('phone').value;
                        
                        // Validation
                        if (!amount || amount < 1) {
                            alert('💰 Please enter a tip amount of at least KSh 1');
                            return;
                        }
                        
                        if (!phone || phone.length !== 10 || !phone.startsWith('07')) {
                            alert('📱 Please enter a valid Safaricom number (e.g., 0712345678)');
                            return;
                        }
                        
                        const btn = document.getElementById('payBtn');
                        const msg = document.getElementById('message');
                        
                        btn.disabled = true;
                        btn.innerHTML = '<span class="spinner"></span>Sending your tip...';
                        msg.innerHTML = '<div class="message loading">💫 Preparing your tip for ${workerName}...</div>';
                        
                        // Simulate payment process
                        setTimeout(() => {
                            msg.innerHTML = '<div class="message success">📱 Check your phone and enter your M-Pesa PIN to complete the tip</div>';
                            
                            setTimeout(() => {
                                msg.innerHTML = '<div class="message success">🎉 Thank you! Your tip has been sent to ${workerName} successfully!<div style="text-align: center; margin-top: 20px; font-size: 18px;">🌟 You made someone\\'s day! 🌟</div></div>';
                                btn.innerHTML = 'Tip Sent Successfully! ✅';
                                btn.style.background = '#28a745';
                            }, 3000);
                        }, 2000);
                    });
                </script>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('Payment page error:', error);
        res.status(500).send('Error loading payment page');
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🧪 Testing improved payment page on http://localhost:${PORT}`);
    console.log('Test URL: http://localhost:3001/tip/WHA5RGZ9I');
});