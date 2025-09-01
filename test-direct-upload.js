// Direct test of image upload to existing bucket
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDirectUpload() {
  try {
    console.log('🧪 Testing Direct Image Upload')
    console.log('==============================')
    
    const testPhone = '254700000001'
    
    // Create test image data (1x1 pixel PNG)
    const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64')
    
    const fileName = `${testPhone}/${Date.now()}.png`
    
    console.log(`\n📤 Uploading to: ${fileName}`)
    
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(fileName, testImageData, {
        contentType: 'image/png',
        upsert: true
      })
    
    if (error) {
      console.error('❌ Upload failed:', error)
      return
    }
    
    console.log('✅ Upload successful!')
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName)
    
    console.log('📷 Image URL:', publicUrl)
    
    // Update user profile
    const { error: updateError } = await supabase
      .from('workers')
      .update({ profile_image_url: publicUrl })
      .eq('phone', testPhone)
    
    if (updateError) {
      console.error('❌ Profile update failed:', updateError)
      return
    }
    
    console.log('✅ Profile updated!')
    
    // Verify
    const { data: worker } = await supabase
      .from('workers')
      .select('name, profile_image_url')
      .eq('phone', testPhone)
      .single()
    
    console.log('✅ Final result:', worker)
    console.log('\n🎉 Image upload working! Test user now has profile image.')
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

testDirectUpload()