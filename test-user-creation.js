// Test user creation script
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

console.log('🧪 Testing User Creation')
console.log('========================')
console.log('Supabase URL:', supabaseUrl)
console.log('Anon Key:', supabaseAnonKey ? 'Present' : 'Missing')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Generate test data
function generateWorkerID() {
  return 'W' + Math.random().toString(36).substr(2, 8).toUpperCase()
}

function generateQRData(workerID) {
  const paybillNumber = '174379'
  return JSON.stringify({
    paybill: paybillNumber,
    account: workerID,
    workerID
  })
}

async function testUserCreation() {
  try {
    console.log('\n📝 Creating test user...')
    
    const testUser = {
      name: 'Test Worker',
      gender: 'Male',
      occupation: 'Test Occupation',
      phone: '254712345678',
      worker_id: generateWorkerID(),
      qr_code: generateQRData('TEST123'),
      subscription_plan: 'free',
      subscription_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      total_tips: 0,
      tip_count: 0
    }
    
    console.log('Test user data:', testUser)
    
    const { data, error } = await supabase
      .from('workers')
      .insert(testUser)
      .select()
    
    if (error) {
      console.error('❌ User creation failed:', error)
      
      // Check if it's a table/permission issue
      if (error.code === '42P01') {
        console.error('💡 Table "workers" does not exist')
      } else if (error.code === '42501') {
        console.error('💡 Permission denied - check RLS policies')
      }
      
      return false
    }
    
    console.log('✅ User created successfully!')
    console.log('Created user:', data[0])
    
    // Test reading the user back
    console.log('\n📖 Testing user retrieval...')
    const { data: retrievedUser, error: retrieveError } = await supabase
      .from('workers')
      .select('*')
      .eq('worker_id', testUser.worker_id)
      .single()
    
    if (retrieveError) {
      console.error('❌ User retrieval failed:', retrieveError)
      return false
    }
    
    console.log('✅ User retrieved successfully!')
    console.log('Retrieved user:', retrievedUser)
    
    // Clean up - delete test user
    console.log('\n🧹 Cleaning up test user...')
    const { error: deleteError } = await supabase
      .from('workers')
      .delete()
      .eq('worker_id', testUser.worker_id)
    
    if (deleteError) {
      console.error('⚠️ Failed to delete test user:', deleteError)
    } else {
      console.log('✅ Test user deleted successfully!')
    }
    
    return true
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return false
  }
}

async function testConnection() {
  try {
    console.log('\n🔗 Testing Supabase connection...')
    
    const { data, error } = await supabase
      .from('workers')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error)
      return false
    }
    
    console.log('✅ Supabase connection successful!')
    return true
    
  } catch (err) {
    console.error('❌ Connection error:', err)
    return false
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting tests...\n')
  
  // Test 1: Connection
  const connectionOk = await testConnection()
  if (!connectionOk) {
    console.log('\n❌ Tests failed - connection issue')
    process.exit(1)
  }
  
  // Test 2: User creation
  const userCreationOk = await testUserCreation()
  
  console.log('\n📊 Test Results:')
  console.log('================')
  console.log('Connection:', connectionOk ? '✅ PASS' : '❌ FAIL')
  console.log('User Creation:', userCreationOk ? '✅ PASS' : '❌ FAIL')
  
  if (connectionOk && userCreationOk) {
    console.log('\n🎉 All tests passed! User creation should work in the app.')
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above.')
  }
}

runTests().catch(console.error)