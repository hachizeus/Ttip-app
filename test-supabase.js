const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cpbonffjhrckiiqbsopt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwYm9uZmZqaHJja2lpcWJzb3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjkzODYsImV4cCI6MjA3MjE0NTM4Nn0.DD5amuyk0bzNQhpOxsPxP9d6-HFZfSIH57CIUF0eTgU';

const supabase = createClient(supabaseUrl, supabaseKey);

const testSupabase = async () => {
  console.log('🧪 Testing Supabase Connection...\n');
  
  // Test 1: Create test worker
  console.log('1️⃣ Creating test worker...');
  const testWorker = {
    name: 'Test Worker',
    gender: 'Male',
    occupation: 'Tester',
    phone: '254759001048',
    worker_id: 'TEST' + Date.now(),
    qr_code: JSON.stringify({
      paybill: '174379',
      account: 'TEST' + Date.now(),
      workerID: 'TEST' + Date.now()
    }),
    subscription_plan: 'free'
  };
  
  try {
    const { data, error } = await supabase
      .from('workers')
      .insert(testWorker)
      .select()
      .single();
    
    if (error) throw error;
    console.log('✅ Worker created:', data.worker_id);
    
    // Test 2: Fetch worker
    console.log('\n2️⃣ Fetching worker...');
    const { data: fetchedWorker, error: fetchError } = await supabase
      .from('workers')
      .select('*')
      .eq('worker_id', data.worker_id)
      .single();
    
    if (fetchError) throw fetchError;
    console.log('✅ Worker fetched:', fetchedWorker.name);
    
    // Test 3: Create test tip
    console.log('\n3️⃣ Creating test tip...');
    const { data: tip, error: tipError } = await supabase
      .from('tips')
      .insert({
        worker_id: data.worker_id,
        amount: 100,
        customer_phone: '254712345678',
        transaction_id: 'TEST_TXN_' + Date.now(),
        status: 'completed'
      })
      .select()
      .single();
    
    if (tipError) throw tipError;
    console.log('✅ Tip created:', tip.amount);
    
    // Test 4: Check updated worker stats
    console.log('\n4️⃣ Checking updated worker stats...');
    const { data: updatedWorker, error: updateError } = await supabase
      .from('workers')
      .select('total_tips, tip_count')
      .eq('worker_id', data.worker_id)
      .single();
    
    if (updateError) throw updateError;
    console.log('✅ Worker stats updated:', {
      total_tips: updatedWorker.total_tips,
      tip_count: updatedWorker.tip_count
    });
    
    // Test 5: Fetch leaderboard
    console.log('\n5️⃣ Fetching leaderboard...');
    const { data: leaderboard, error: leaderError } = await supabase
      .from('workers')
      .select('name, total_tips, tip_count')
      .order('total_tips', { ascending: false })
      .limit(5);
    
    if (leaderError) throw leaderError;
    console.log('✅ Leaderboard fetched:', leaderboard.length, 'workers');
    
    console.log('\n🏁 All Supabase tests passed!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
};

testSupabase();