// Test Supabase connection
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

console.log('Testing Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey ? 'Present' : 'Missing')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test connection
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Supabase error:', error)
    } else {
      console.log('Supabase connection successful!')
    }
  } catch (err) {
    console.error('Connection failed:', err)
  }
}

testConnection()