// Test profile image upload after bucket creation
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

console.log('🧪 Testing Profile Image Upload')
console.log('===============================')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testImageUpload() {
  try {
    // Use existing test user
    const testPhone = '254700000001'
    
    console.log('\n📤 Testing image upload...')
    
    // Create a simple test image (base64 encoded 1x1 pixel PNG)
    const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64')
    
    const fileName = `${testPhone}/${Date.now()}.png`
    
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(fileName, testImageData, {
        contentType: 'image/png',
        upsert: true
      })
    
    if (error) {
      console.error('❌ Upload failed:', error)
      return false
    }
    
    console.log('✅ Image uploaded successfully!')
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName)
    
    console.log('📷 Public URL:', publicUrl)
    
    // Update user profile with image URL
    const { error: updateError } = await supabase
      .from('workers')
      .update({ profile_image_url: publicUrl })
      .eq('phone', testPhone)
    
    if (updateError) {
      console.error('❌ Failed to update profile:', updateError)
      return false
    }
    
    console.log('✅ Profile updated with image URL!')
    
    // Verify the update
    const { data: worker, error: fetchError } = await supabase
      .from('workers')
      .select('name, profile_image_url')
      .eq('phone', testPhone)
      .single()
    
    if (fetchError) {
      console.error('❌ Failed to fetch updated profile:', fetchError)
      return false
    }
    
    console.log('✅ Updated profile:', worker)
    
    return true
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return false
  }
}

async function testBucketAccess() {
  try {
    console.log('\n🗂️ Testing bucket access...')
    
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error('❌ Failed to list buckets:', error)
      return false
    }
    
    const profileBucket = buckets.find(b => b.name === 'profile-images')
    
    if (!profileBucket) {
      console.log('❌ profile-images bucket not found')
      console.log('💡 Run the SQL script first: create-storage-bucket.sql')
      return false
    }
    
    console.log('✅ profile-images bucket exists')
    console.log('Bucket details:', profileBucket)
    
    return true
    
  } catch (err) {
    console.error('❌ Error:', err)
    return false
  }
}

async function runTest() {
  console.log('🚀 Starting image upload test...\n')
  
  const bucketOk = await testBucketAccess()
  if (!bucketOk) {
    console.log('\n❌ Bucket test failed. Create the bucket first.')
    return
  }
  
  const uploadOk = await testImageUpload()
  
  console.log('\n📊 Results:')
  console.log('Bucket Access:', bucketOk ? '✅ PASS' : '❌ FAIL')
  console.log('Image Upload:', uploadOk ? '✅ PASS' : '❌ FAIL')
  
  if (bucketOk && uploadOk) {
    console.log('\n🎉 Image upload is working!')
    console.log('💡 Test user 254700000001 now has a profile image')
    console.log('💡 Phone number is hidden from profile display')
  }
}

runTest().catch(console.error)