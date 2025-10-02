import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function createTestWorker() {
    const { data, error } = await supabase
        .from('workers')
        .insert([
            {
                worker_id: 'TEST123',
                name: 'John Doe',
                occupation: 'Delivery Driver',
                phone: '254708374149'
            }
        ])
        .select();

    if (error) {
        console.error('Error creating worker:', error);
    } else {
        console.log('Test worker created:', data);
        console.log('Test URL: http://localhost:3000/tip/TEST123');
    }
}

createTestWorker();