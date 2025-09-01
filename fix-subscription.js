import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cpbonffjhrckiiqbsopt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwYm9uZmZqaHJja2lpcWJzb3B0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU2OTM4NiwiZXhwIjoyMDcyMTQ1Mzg2fQ.ywj3R1uw20Q1Bs-7t5IovFPP_rW1Ji9dXTRbXogQdtw'
)

async function fixSubscription() {
  const phone = '254759001048'
  
  // Set expiry to 1 month from now
  const expiryDate = new Date()
  expiryDate.setMonth(expiryDate.getMonth() + 1)
  
  const { error } = await supabase
    .from('workers')
    .update({
      subscription_plan: 'lite',
      subscription_expiry: expiryDate.toISOString()
    })
    .eq('phone', phone)
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log(`✅ Subscription updated to lite_plan for ${phone}`)
    console.log(`📅 Expires: ${expiryDate.toISOString()}`)
  }
}

fixSubscription()