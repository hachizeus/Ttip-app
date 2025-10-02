import React from 'react'
import { View, Text } from 'react-native'

interface PaymentPreviewProps {
  amount: number
  recipient: string
}

export default function PaymentPreview({ amount, recipient }: PaymentPreviewProps) {
  return (
    <View>
      <Text>Payment Preview</Text>
      <Text>Amount: {amount}</Text>
      <Text>To: {recipient}</Text>
    </View>
  )
}