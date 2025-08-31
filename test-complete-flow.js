const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const BASE_URL = 'http://localhost:3000';
const supabase = createClient(
  'https://cpbonffjhrckiiqbsopt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwYm9uZmZqaHJja2lpcWJzb3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjkzODYsImV4cCI6MjA3MjE0NTM4Nn0.DD5amuyk0bzNQhpOxsPxP9d6-HFZfSIH57CIUF0eTgU'
);

const testCompleteFlow = async () => {
  console.log('🚀 Testing Complete TTip Flow\n');
  
  // Step 1: Create test worker
  console.log('1️⃣ Creating test worker...');
  const workerID = 'TEST' + Date.now();
  const testWorker = {
    name: 'Test Worker',
    gender: 'Male',
    occupation: 'Waiter',
    phone: '254708374149',
    worker_id: workerID,
    qr_code: JSON.stringify({
      paybill: '174379',
      account: workerID,
      workerID: workerID
    })
  };
  
  try {
    const { data: worker, error } = await supabase
      .from('workers')
      .insert(testWorker)
      .select()
      .single();
    
    if (error) throw error;
    console.log('✅ Worker created:', worker.worker_id);
    
    // Step 2: Test M-Pesa payment via backend
    console.log('\n2️⃣ Testing M-Pesa payment...');
    try {
      const paymentResponse = await axios.post(`${BASE_URL}/api/pay`, {
        phone: '254708374149',
        amount: 10,
        accountReference: worker.worker_id
      });
      console.log('✅ M-Pesa initiated:', paymentResponse.data);
      
      // Step 3: Create tip record
      console.log('\n3️⃣ Creating tip record...');
      const { data: tip, error: tipError } = await supabase
        .from('tips')
        .insert({
          worker_id: worker.worker_id,
          amount: 10,
          customer_phone: '254708374149',
          transaction_id: paymentResponse.data.CheckoutRequestID,
          status: 'pending'
        })
        .select()
        .single();
      
      if (tipError) throw tipError;
      console.log('✅ Tip record created:', tip.id);
      
      console.log('\n🎉 COMPLETE FLOW TEST SUCCESSFUL!');
      console.log('📱 Check Safaricom test phone for STK push');
      console.log('🔗 Callback URL:', 'https://cpbonffjhrckiiqbsopt.supabase.co/functions/v1/mpesa-callback');
      console.log('📊 Monitor Supabase Functions logs for callback');
      
    } catch (paymentError) {
      console.log('❌ M-Pesa payment failed:', paymentError.response?.data || paymentError.message);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
};

testCompleteFlow();