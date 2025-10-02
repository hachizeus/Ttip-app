import React from 'react'
import { View, Text } from 'react-native'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View>
          <Text>Something went wrong.</Text>
        </View>
      )
    }

    return this.props.children
  }
}