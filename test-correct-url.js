// Test correct backend URL
fetch('https://ttip-app.onrender.com/health')
  .then(r => r.text())
  .then(text => console.log('✅ Backend response:', text.substring(0, 100)))
  .catch(err => console.log('❌ Error:', err.message))