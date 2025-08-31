const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000'

export const initiateMpesaPayment = async (phone: string, amount: number, workerID: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        amount,
        accountReference: workerID
      }),
    })
    return await response.json()
  } catch (error) {
    throw new Error('Payment initiation failed')
  }
}

export const generateWorkerID = (): string => {
  return 'W' + Math.random().toString(36).substr(2, 8).toUpperCase()
}

export const generateQRData = (workerID: string): string => {
  const paybillNumber = '174379' // Replace with your actual paybill
  return JSON.stringify({
    paybill: paybillNumber,
    account: workerID,
    workerID
  })
}