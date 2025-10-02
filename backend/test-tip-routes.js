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
app.get('/tip/:workerId', async (req, res) => {
    res.redirect(`/pay/${req.params.workerId}`);
});

// Test payment page
app.get('/pay/:workerId', async (req, res) => {
    const { workerId } = req.params;
    
    try {
        const { data: worker } = await supabase
            .from('workers')
            .select('name, occupation')
            .eq('worker_id', workerId)
            .single();
        
        if (!worker) {
            return res.status(404).send('Worker not found');
        }
        
        res.send(`
            <h1>Payment Page for ${worker.name}</h1>
            <p>Occupation: ${worker.occupation}</p>
            <p>Worker ID: ${workerId}</p>
            <p>✅ Route working correctly!</p>
        `);
        
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
});

// API route
app.get('/api/tip/:workerId', async (req, res) => {
    const { workerId } = req.params;
    
    try {
        const { data: worker } = await supabase
            .from('workers')
            .select('*')
            .eq('worker_id', workerId)
            .single();
        
        if (!worker) {
            return res.status(404).json({ error: 'Worker not found' });
        }
        
        res.json({ 
            success: true,
            worker,
            paymentUrl: `http://localhost:3001/pay/${workerId}`,
            message: 'Worker found - route working!'
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🧪 Testing tip routes on http://localhost:${PORT}`);
    console.log('Test URLs:');
    console.log(`  http://localhost:${PORT}/tip/WHA5RGZ9I`);
    console.log(`  http://localhost:${PORT}/api/tip/WHA5RGZ9I`);
});