// Test script for Settings functionality
// Run this in Node.js environment with Supabase client

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_PHONE = 'WNRSVWHJQ'

async function testSettingsFunctionality() {
  console.log('🧪 Testing Settings Functionality for user:', TEST_PHONE)
  console.log('=' .repeat(50))

  try {
    // Test 1: Fetch user data
    console.log('📋 Test 1: Fetching user data...')
    const { data: worker, error: fetchError } = await supabase
      .from('workers')
      .select('name, occupation, bio, profile_image_url, phone')
      .eq('phone', TEST_PHONE)
      .single()

    if (fetchError) {
      console.error('❌ Fetch Error:', fetchError.message)
      return
    }

    if (worker) {
      console.log('✅ User data fetched successfully:')
      console.log('   Name:', worker.name || 'Not set')
      console.log('   Occupation:', worker.occupation || 'Not set')
      console.log('   Bio:', worker.bio || 'Not set')
      console.log('   Profile Image:', worker.profile_image_url || 'Not set')
    } else {
      console.log('❌ User not found')
      return
    }

    // Test 2: Update occupation
    console.log('\n🔄 Test 2: Updating occupation...')
    const newOccupation = 'Senior Cook'
    const { error: updateError } = await supabase
      .from('workers')
      .update({ occupation: newOccupation })
      .eq('phone', TEST_PHONE)

    if (updateError) {
      console.error('❌ Update Error:', updateError.message)
    } else {
      console.log('✅ Occupation updated successfully to:', newOccupation)
    }

    // Test 3: Update bio
    console.log('\n📝 Test 3: Updating bio...')
    const newBio = 'Experienced cook with 5+ years in hospitality. Passionate about creating delicious meals.'
    const { error: bioError } = await supabase
      .from('workers')
      .update({ bio: newBio })
      .eq('phone', TEST_PHONE)

    if (bioError) {
      console.error('❌ Bio Update Error:', bioError.message)
    } else {
      console.log('✅ Bio updated successfully')
    }

    // Test 4: Verify updates
    console.log('\n✅ Test 4: Verifying updates...')
    const { data: updatedWorker, error: verifyError } = await supabase
      .from('workers')
      .select('name, occupation, bio, profile_image_url')
      .eq('phone', TEST_PHONE)
      .single()

    if (verifyError) {
      console.error('❌ Verify Error:', verifyError.message)
    } else {
      console.log('✅ Updated data verified:')
      console.log('   Name:', updatedWorker.name)
      console.log('   Occupation:', updatedWorker.occupation)
      console.log('   Bio:', updatedWorker.bio)
    }

    // Test 5: Test storage bucket access
    console.log('\n🗂️ Test 5: Testing storage bucket access...')
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      console.error('❌ Bucket Error:', bucketError.message)
    } else {
      const profileBucket = buckets.find(b => b.name === 'profile-images')
      if (profileBucket) {
        console.log('✅ Profile images bucket exists and is accessible')
      } else {
        console.log('❌ Profile images bucket not found')
      }
    }

    console.log('\n🎉 All tests completed!')

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

// Run the test
testSettingsFunctionality()

// Instructions to run:
// 1. Install dependencies: npm install @supabase/supabase-js
// 2. Update supabaseUrl and supabaseKey with your actual values
// 3. Run: node test-settings.js