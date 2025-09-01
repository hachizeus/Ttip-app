// Test subscription payment endpoint
console.log('🧪 Testing Subscription Payment Endpoint')
console.log('========================================')

const testData = {
  phone: '254708374149', // Test phone number
  amount: 50,
  plan: 'lite_plan'
}

const backendUrl = 'https://ttip-app.onrender.com'

async function testSubscriptionPayment() {
  try {
    console.log('📱 Testing with data:', testData)
    console.log('🌐 Backend URL:', backendUrl)
    
    const response = await fetch(`${backendUrl}/api/subscription-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'TTip-Test/1.0'
      },
      body: JSON.stringify(testData)
    })
    
    console.log('📊 Response Status:', response.status)
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()))
    
    const text = await response.text()
    console.log('📄 Raw Response:', text)
    
    if (response.ok) {
      try {
        const json = JSON.parse(text)
        console.log('✅ Parsed JSON:', json)
        
        if (json.success) {
          console.log('🎉 Payment initiated successfully!')
          console.log('🔗 Checkout Request ID:', json.checkoutRequestID)
        } else {
          console.log('❌ Payment failed:', json.error)
        }
      } catch (parseError) {
        console.log('❌ JSON Parse Error:', parseError.message)
      }
    } else {
      console.log('❌ HTTP Error:', response.status, response.statusText)
    }
    
  } catch (error) {
    console.log('❌ Network Error:', error.message)
  }
}

// Test health endpoint first
async function testHealth() {
  try {
    console.log('\n🏥 Testing Health Endpoint...')
    const response = await fetch(`${backendUrl}/health`)
    const text = await response.text()
    console.log('Health Response:', text)
    
    if (response.ok) {
      console.log('✅ Backend is healthy')
    } else {
      console.log('❌ Backend health check failed')
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message)
  }
}

// Run tests
async function runTests() {
  await testHealth()
  console.log('\n' + '='.repeat(50))
  await testSubscriptionPayment()
  
  console.log('\n💡 If you see "Not Found", the endpoint might not exist')
  console.log('💡 If you see JSON parse error, the server is returning HTML/text instead of JSON')
  console.log('💡 Check the backend logs for more details')
}

runTests()