// Create storage bucket using Supabase client
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

console.log('🗂️ Creating Storage Bucket')
console.log('==========================')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createBucket() {
  try {
    console.log('\n📦 Creating profile-images bucket...')
    
    const { data, error } = await supabase.storage.createBucket('profile-images', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    })
    
    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Bucket already exists!')
      } else {
        console.error('❌ Failed to create bucket:', error)
        return false
      }
    } else {
      console.log('✅ Bucket created successfully!')
    }
    
    // List buckets to verify
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError)
      return false
    }
    
    const profileBucket = buckets.find(b => b.name === 'profile-images')
    if (profileBucket) {
      console.log('✅ Bucket verified:', profileBucket.name)
      return true
    }
    
    return false
    
  } catch (err) {
    console.error('❌ Error:', err)
    return false
  }
}

createBucket().then(success => {
  if (success) {
    console.log('\n🎉 Storage bucket ready!')
    console.log('💡 Now run: node test-image-upload.js')
  } else {
    console.log('\n❌ Bucket creation failed')
    console.log('💡 You may need to create it manually in Supabase Dashboard')
  }
})