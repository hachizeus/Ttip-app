import React from 'react'
import { View, Image, Text, StyleSheet } from 'react-native'

interface ProfilePhotoProps {
  photoUrl?: string
  name: string
  rank?: number
  size?: number
}

export default function ProfilePhoto({ photoUrl, name, rank, size = 50 }: ProfilePhotoProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return null
    }
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {photoUrl ? (
        <Image 
          source={{ uri: photoUrl }} 
          style={[styles.photo, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.3 }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      
      {rank && rank <= 3 && (
        <View style={[styles.medal, { right: -size * 0.1, top: -size * 0.1 }]}>
          <Text style={[styles.medalText, { fontSize: size * 0.3 }]}>
            {getMedalEmoji(rank)}
          </Text>
        </View>
      )}
      
      {rank && rank > 3 && (
        <View style={[styles.rankBadge, { right: -size * 0.1, top: -size * 0.1 }]}>
          <Text style={[styles.rankText, { fontSize: size * 0.2 }]}>
            {rank}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  photo: {
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    backgroundColor: '#e1e5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#666',
    fontWeight: 'bold',
  },
  medal: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  medalText: {
    textAlign: 'center',
  },
  rankBadge: {
    position: 'absolute',
    backgroundColor: '#667eea',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  rankText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
})