// Test different backend URLs
console.log('🧪 Testing Backend URLs')
console.log('======================')

const urls = [
  'https://ttip-app.onrender.com',
  'https://ttip-app.onrender.com/health',
  'https://ttip-app.onrender.com/api/health'
]

async function testUrl(url) {
  try {
    console.log(`\n🌐 Testing: ${url}`)
    const response = await fetch(url)
    const text = await response.text()
    
    console.log(`📊 Status: ${response.status}`)
    console.log(`📄 Response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`)
    
    if (response.ok) {
      console.log('✅ URL is working')
    } else {
      console.log('❌ URL returned error')
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
  }
}

async function runTests() {
  for (const url of urls) {
    await testUrl(url)
  }
  
  console.log('\n💡 If all URLs return 404, the backend might be:')
  console.log('   - Not deployed correctly')
  console.log('   - Using a different URL')
  console.log('   - Not running')
}

runTests()