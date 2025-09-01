// Simple QR code generation test
console.log('🧪 Testing QR Code Generation')
console.log('=============================')

const testWorkerID = 'W9MS8X9GW'
const qrUrl = `https://ttip-app.onrender.com/tip/${testWorkerID}?ref=test&worker=${testWorkerID}&timestamp=${Date.now()}`

console.log('📱 Worker ID:', testWorkerID)
console.log('🔗 QR URL:', qrUrl)
console.log('📏 URL Length:', qrUrl.length, 'characters')

// Test URL accessibility
async function testUrl() {
  try {
    console.log('\n🌐 Testing URL accessibility...')
    const response = await fetch(qrUrl)
    console.log('✅ URL Status:', response.status)
    console.log('✅ URL accessible:', response.ok ? 'YES' : 'NO')
  } catch (error) {
    console.log('❌ URL test failed:', error.message)
  }
}

// QR Code complexity analysis
function analyzeComplexity() {
  console.log('\n📊 QR Code Complexity Analysis:')
  console.log('- Base URL length:', qrUrl.length)
  console.log('- Contains parameters:', qrUrl.includes('?') ? 'YES' : 'NO')
  console.log('- Parameter count:', (qrUrl.match(/[&?]/g) || []).length)
  console.log('- Expected complexity: HIGH (due to long URL with parameters)')
}

console.log('\n🎯 QR Code Configuration:')
console.log('- Size: 250px')
console.log('- Logo: mylogo.png')
console.log('- Logo size: 60px')
console.log('- Logo border radius: 30px (circular)')
console.log('- Error correction: M (Medium)')

analyzeComplexity()
testUrl()

console.log('\n💡 To test download in app:')
console.log('1. Navigate to QR Code page')
console.log('2. Ensure you have worker ID:', testWorkerID)
console.log('3. Click download button')
console.log('4. Check gallery for saved QR code')

console.log('\n✨ Test completed!')