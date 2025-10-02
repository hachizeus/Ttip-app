import React from 'react'
import { View, TextInput } from 'react-native'

interface SearchSystemProps {
  onSearch: (query: string) => void
}

export default function SearchSystem({ onSearch }: SearchSystemProps) {
  return (
    <View>
      <TextInput placeholder="Search..." onChangeText={onSearch} />
    </View>
  )
}