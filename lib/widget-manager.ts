import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'
import { getCurrentUser } from './auth'

export const generateWidgetQR = async () => {
  try {
    const phone = await getCurrentUser()
    if (!phone) return null

    // Get worker data
    const { data: worker } = await supabase
      .from('workers')
      .select('worker_id, name, occupation')
      .eq('phone', phone)
      .single()

    if (!worker) return null

    const qrData = {
      workerID: worker.worker_id,
      name: worker.name,
      occupation: worker.occupation,
      url: `${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ttip-app.onrender.com'}/tip/${worker.worker_id}`
    }

    // Store for widget access
    await AsyncStorage.setItem('widgetQRData', JSON.stringify(qrData))
    
    return qrData
  } catch (error) {
    console.error('Widget QR generation error:', error)
    return null
  }
}

export const updateWidget = async () => {
  const qrData = await generateWidgetQR()
  if (!qrData) return

  // For Android widgets - this would integrate with native widget update
  // Implementation depends on native module
  console.log('Widget updated with QR data:', qrData)
}