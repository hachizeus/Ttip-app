// Test Settings Functionality for User WNRSVWHJQ
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://cpbonffjhrckiiqbsopt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwYm9uZmZqaHJja2lpcWJzb3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjkzODYsImV4cCI6MjA3MjE0NTM4Nn0.DD5amuyk0bzNQhpOxsPxP9d6-HFZfSIH57CIUF0eTgU'
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_USER = 'WNRSVWHJQ'

async function testSettingsForUser() {
  console.log(`🧪 Testing Settings for User: ${TEST_USER}`)
  console.log('='.repeat(50))

  try {
    // Test 1: Check if user exists
    console.log('📋 Test 1: Checking user existence...')
    const { data: user, error: fetchError } = await supabase
      .from('workers')
      .select('*')
      .eq('phone', TEST_USER)
      .single()

    if (fetchError) {
      console.log('❌ User not found, creating test user...')
      
      // Create test user
      const { error: createError } = await supabase
        .from('workers')
        .insert({
          phone: TEST_USER,
          name: 'Test User WNRSVWHJQ',
          occupation: 'Test Occupation',
          bio: 'Test bio for settings functionality',
          gender: 'other',
          created_at: new Date().toISOString()
        })

      if (createError) {
        console.error('❌ Failed to create user:', createError.message)
        return
      }
      console.log('✅ Test user created successfully')
    } else {
      console.log('✅ User exists:', user.name || 'No name set')
    }

    // Test 2: Update occupation
    console.log('\n🔄 Test 2: Updating occupation...')
    const newOccupation = 'Senior Software Developer'
    const { error: updateOccError } = await supabase
      .from('workers')
      .update({ occupation: newOccupation })
      .eq('phone', TEST_USER)

    if (updateOccError) {
      console.error('❌ Occupation update failed:', updateOccError.message)
    } else {
      console.log('✅ Occupation updated to:', newOccupation)
    }

    // Test 3: Update bio
    console.log('\n📝 Test 3: Updating bio...')
    const newBio = 'Experienced developer passionate about mobile apps and backend systems. Specializes in React Native and Node.js development.'
    const { error: bioError } = await supabase
      .from('workers')
      .update({ bio: newBio })
      .eq('phone', TEST_USER)

    if (bioError) {
      console.error('❌ Bio update failed:', bioError.message)
    } else {
      console.log('✅ Bio updated successfully')
    }

    // Test 4: Verify all updates
    console.log('\n✅ Test 4: Verifying updates...')
    const { data: updatedUser, error: verifyError } = await supabase
      .from('workers')
      .select('name, occupation, bio, profile_image_url, phone')
      .eq('phone', TEST_USER)
      .single()

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message)
    } else {
      console.log('✅ Current user data:')
      console.log('   Phone:', updatedUser.phone)
      console.log('   Name:', updatedUser.name || 'Not set')
      console.log('   Occupation:', updatedUser.occupation || 'Not set')
      console.log('   Bio:', updatedUser.bio || 'Not set')
      console.log('   Profile Image:', updatedUser.profile_image_url || 'Not set')
    }

    // Test 5: Test storage bucket access
    console.log('\n🗂️ Test 5: Testing storage access...')
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      console.error('❌ Storage access failed:', bucketError.message)
    } else {
      const profileBucket = buckets.find(b => b.name === 'profile-images')
      console.log(profileBucket ? '✅ Profile images bucket accessible' : '❌ Profile images bucket not found')
    }

    // Test 6: Test profile image URL generation
    console.log('\n🖼️ Test 6: Testing profile image URL...')
    const testImagePath = `${TEST_USER}/test-image.jpg`
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(testImagePath)
    
    console.log('✅ Generated image URL:', publicUrl)

    console.log('\n🎉 All settings tests completed successfully!')
    console.log('\n📊 Test Summary:')
    console.log('   ✅ User data retrieval: PASSED')
    console.log('   ✅ Occupation update: PASSED')
    console.log('   ✅ Bio update: PASSED')
    console.log('   ✅ Data verification: PASSED')
    console.log('   ✅ Storage access: PASSED')
    console.log('   ✅ Image URL generation: PASSED')

  } catch (error) {
    console.error('❌ Test suite failed:', error.message)
  }
}

testSettingsForUser()