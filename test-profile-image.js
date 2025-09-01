// Test profile image upload and profile data script
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

console.log('🧪 Testing Profile Image Upload & Profile Data')
console.log('===============================================')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test user data
const testPhone = '254712345678'
const testWorkerID = 'W' + Math.random().toString(36).substr(2, 8).toUpperCase()

async function createTestUser() {
  try {
    console.log('\n📝 Creating test user with profile data...')
    
    const testUser = {
      name: 'John Doe',
      gender: 'Male',
      occupation: 'Software Developer',
      bio: 'Passionate developer with 5 years of experience in mobile apps',
      phone: testPhone,
      worker_id: testWorkerID,
      qr_code: JSON.stringify({ paybill: '174379', account: testWorkerID }),
      subscription_plan: 'free',
      subscription_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      total_tips: 0,
      tip_count: 0
    }
    
    const { data, error } = await supabase
      .from('workers')
      .insert(testUser)
      .select()
    
    if (error) {
      console.error('❌ User creation failed:', error)
      return false
    }
    
    console.log('✅ Test user created successfully!')
    return true
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return false
  }
}

async function testProfileDataRetrieval() {
  try {
    console.log('\n📖 Testing profile data retrieval...')
    
    const { data: worker, error } = await supabase
      .from('workers')
      .select('name, occupation, bio, profile_image_url, phone')
      .eq('phone', testPhone)
      .single()
    
    if (error) {
      console.error('❌ Profile data retrieval failed:', error)
      return false
    }
    
    console.log('✅ Profile data retrieved successfully!')
    console.log('Profile data:', {
      name: worker.name,
      occupation: worker.occupation,
      bio: worker.bio,
      profile_image_url: worker.profile_image_url,
      phone: worker.phone
    })
    
    // Check if bio is showing correctly
    if (worker.bio && worker.bio !== 'Passionate service worker dedicated to excellence') {
      console.log('✅ Bio is correctly stored and retrieved')
    } else {
      console.log('⚠️ Bio is empty or showing default text')
    }
    
    return true
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return false
  }
}

async function testStorageBucket() {
  try {
    console.log('\n🗂️ Testing storage bucket access...')
    
    // List buckets to see if profile-images bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Failed to list buckets:', bucketsError)
      return false
    }
    
    console.log('Available buckets:', buckets.map(b => b.name))
    
    const profileImagesBucket = buckets.find(b => b.name === 'profile-images')
    if (!profileImagesBucket) {
      console.log('⚠️ profile-images bucket does not exist')
      console.log('💡 You need to create the profile-images bucket in Supabase Storage')
      return false
    }
    
    console.log('✅ profile-images bucket exists')
    
    // Test uploading a dummy file
    const dummyFile = Buffer.from('dummy image data')
    const fileName = `test/${testWorkerID}/test-image.jpg`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(fileName, dummyFile, {
        contentType: 'image/jpeg',
        upsert: true
      })
    
    if (uploadError) {
      console.error('❌ File upload failed:', uploadError)
      return false
    }
    
    console.log('✅ Test file uploaded successfully!')
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName)
    
    console.log('Public URL:', publicUrl)
    
    // Update user profile with image URL
    const { error: updateError } = await supabase
      .from('workers')
      .update({ profile_image_url: publicUrl })
      .eq('phone', testPhone)
    
    if (updateError) {
      console.error('❌ Failed to update profile image URL:', updateError)
      return false
    }
    
    console.log('✅ Profile image URL updated in database')
    
    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('profile-images')
      .remove([fileName])
    
    if (deleteError) {
      console.log('⚠️ Failed to delete test file:', deleteError)
    } else {
      console.log('✅ Test file cleaned up')
    }
    
    return true
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return false
  }
}

async function updateProfileData() {
  try {
    console.log('\n✏️ Testing profile data update...')
    
    const updatedData = {
      occupation: 'Senior Software Developer',
      bio: 'Experienced developer specializing in React Native and Node.js applications'
    }
    
    const { error } = await supabase
      .from('workers')
      .update(updatedData)
      .eq('phone', testPhone)
    
    if (error) {
      console.error('❌ Profile update failed:', error)
      return false
    }
    
    console.log('✅ Profile data updated successfully!')
    
    // Verify the update
    const { data: updatedWorker, error: fetchError } = await supabase
      .from('workers')
      .select('occupation, bio')
      .eq('phone', testPhone)
      .single()
    
    if (fetchError) {
      console.error('❌ Failed to fetch updated data:', fetchError)
      return false
    }
    
    console.log('Updated profile:', updatedWorker)
    return true
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return false
  }
}

async function cleanupTestUser() {
  try {
    console.log('\n🧹 Cleaning up test user...')
    
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('phone', testPhone)
    
    if (error) {
      console.error('⚠️ Failed to delete test user:', error)
    } else {
      console.log('✅ Test user deleted successfully!')
    }
    
  } catch (err) {
    console.error('❌ Cleanup error:', err)
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting profile tests...\n')
  
  let results = {
    userCreation: false,
    profileRetrieval: false,
    storageAccess: false,
    profileUpdate: false
  }
  
  // Test 1: Create test user
  results.userCreation = await createTestUser()
  if (!results.userCreation) {
    console.log('\n❌ Tests failed - could not create test user')
    process.exit(1)
  }
  
  // Test 2: Profile data retrieval
  results.profileRetrieval = await testProfileDataRetrieval()
  
  // Test 3: Storage bucket and image upload
  results.storageAccess = await testStorageBucket()
  
  // Test 4: Profile data update
  results.profileUpdate = await updateProfileData()
  
  // Cleanup
  await cleanupTestUser()
  
  console.log('\n📊 Test Results:')
  console.log('================')
  console.log('User Creation:', results.userCreation ? '✅ PASS' : '❌ FAIL')
  console.log('Profile Retrieval:', results.profileRetrieval ? '✅ PASS' : '❌ FAIL')
  console.log('Storage Access:', results.storageAccess ? '✅ PASS' : '❌ FAIL')
  console.log('Profile Update:', results.profileUpdate ? '✅ PASS' : '❌ FAIL')
  
  if (Object.values(results).every(r => r)) {
    console.log('\n🎉 All tests passed! Profile functionality should work correctly.')
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above.')
    
    if (!results.storageAccess) {
      console.log('\n💡 To fix storage issues:')
      console.log('1. Go to Supabase Dashboard > Storage')
      console.log('2. Create a new bucket named "profile-images"')
      console.log('3. Make it public or set appropriate policies')
    }
  }
}

runTests().catch(console.error)