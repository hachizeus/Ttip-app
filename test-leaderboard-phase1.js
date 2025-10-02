// Phase 1 Leaderboard Test
// Test the new leaderboard with profile photos and navigation

const testLeaderboard = async () => {
  try {
    console.log('Testing leaderboard API...')
    
    const response = await fetch('https://ttip-app.onrender.com/api/leaderboard')
    const data = await response.json()
    
    console.log('Leaderboard response:', data)
    
    if (data.workers && data.workers.length > 0) {
      console.log('✅ Leaderboard API working')
      console.log(`Found ${data.workers.length} workers`)
      
      // Check if profile photos are included
      const workersWithPhotos = data.workers.filter(w => w.profile_photo_url)
      console.log(`${workersWithPhotos.length} workers have profile photos`)
      
      // Show first few workers
      data.workers.slice(0, 3).forEach((worker, index) => {
        console.log(`${index + 1}. ${worker.name} (${worker.occupation}) - KSh ${worker.total_tips}`)
        console.log(`   Photo: ${worker.profile_photo_url ? 'Yes' : 'No'}`)
      })
    } else {
      console.log('❌ No workers found')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testLeaderboard()