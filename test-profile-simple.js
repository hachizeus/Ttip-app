// Simple profile test - focuses on bio display issue
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

console.log('🧪 Testing Profile Bio Display')
console.log('==============================')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testExistingUser() {
  try {
    console.log('\n📖 Checking existing users with bio data...')
    
    const { data: workers, error } = await supabase
      .from('workers')
      .select('phone, name, occupation, bio, profile_image_url')
      .limit(5)
    
    if (error) {
      console.error('❌ Failed to fetch workers:', error)
      return
    }
    
    console.log(`Found ${workers.length} workers:`)
    workers.forEach((worker, index) => {
      console.log(`\n${index + 1}. Phone: ${worker.phone}`)
      console.log(`   Name: ${worker.name || 'Not set'}`)
      console.log(`   Occupation: ${worker.occupation || 'Not set'}`)
      console.log(`   Bio: ${worker.bio || 'Not set'}`)
      console.log(`   Profile Image: ${worker.profile_image_url ? 'Set' : 'Not set'}`)
    })
    
    // Check if any user has bio data
    const usersWithBio = workers.filter(w => w.bio && w.bio.trim())
    console.log(`\n📊 Users with bio: ${usersWithBio.length}/${workers.length}`)
    
    if (usersWithBio.length === 0) {
      console.log('💡 No users have bio data. The hardcoded text was showing because bio field is empty.')
      console.log('💡 Users need to update their profile in Settings to add bio information.')
    }
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

async function createSampleUserWithBio() {
  try {
    console.log('\n📝 Creating sample user with bio for testing...')
    
    const testPhone = '254700000001'
    const testWorkerID = 'WTEST001'
    
    // Check if user already exists
    const { data: existing } = await supabase
      .from('workers')
      .select('phone')
      .eq('phone', testPhone)
      .single()
    
    if (existing) {
      console.log('⚠️ Test user already exists, updating bio...')
      
      const { error } = await supabase
        .from('workers')
        .update({
          name: 'Sample User',
          occupation: 'Customer Service Representative',
          bio: 'Friendly and dedicated service professional with 3 years of experience in hospitality.'
        })
        .eq('phone', testPhone)
      
      if (error) {
        console.error('❌ Failed to update user:', error)
        return
      }
      
      console.log('✅ Test user updated with bio!')
    } else {
      const testUser = {
        name: 'Sample User',
        gender: 'Female',
        occupation: 'Customer Service Representative',
        bio: 'Friendly and dedicated service professional with 3 years of experience in hospitality.',
        phone: testPhone,
        worker_id: testWorkerID,
        qr_code: JSON.stringify({ paybill: '174379', account: testWorkerID }),
        subscription_plan: 'free',
        subscription_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        total_tips: 0,
        tip_count: 0
      }
      
      const { error } = await supabase
        .from('workers')
        .insert(testUser)
      
      if (error) {
        console.error('❌ Failed to create test user:', error)
        return
      }
      
      console.log('✅ Test user created with bio!')
    }
    
    // Verify the bio is stored correctly
    const { data: user, error: fetchError } = await supabase
      .from('workers')
      .select('name, occupation, bio')
      .eq('phone', testPhone)
      .single()
    
    if (fetchError) {
      console.error('❌ Failed to fetch test user:', fetchError)
      return
    }
    
    console.log('✅ Test user profile:')
    console.log(`   Name: ${user.name}`)
    console.log(`   Occupation: ${user.occupation}`)
    console.log(`   Bio: ${user.bio}`)
    
    console.log('\n💡 You can now test the app with phone: +254700000001')
    console.log('💡 The profile should show the custom bio instead of the hardcoded text.')
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

async function runTest() {
  await testExistingUser()
  await createSampleUserWithBio()
  
  console.log('\n🎯 Summary:')
  console.log('- Fixed profile.tsx to load bio from database')
  console.log('- Created test user with sample bio')
  console.log('- Profile will now show actual user bio or "No bio available" message')
  console.log('- Users can update bio through Settings screen')
}

runTest().catch(console.error)