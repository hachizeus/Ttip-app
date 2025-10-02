import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/theme-context'
import { MaterialIcons } from '@expo/vector-icons'
import { fonts, fontWeights } from '../../lib/fonts'
import ProfilePhoto from '../../components/ProfilePhoto'

interface Worker {
  id: string
  worker_id: string
  name: string
  occupation: string
  total_tips: number
  tip_count: number
  profile_image_url?: string
}

export default function LeaderboardScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('id, worker_id, name, occupation, total_tips, tip_count, profile_image_url')
        .order('total_tips', { ascending: false })
        .limit(20)

      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProfilePress = (worker: Worker) => {
    router.push(`/worker/${worker.worker_id}`)
  }

  const getRankEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return `${index + 1}.`
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>🏆 Leaderboard</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Top earning workers</Text>
      </View>
      <ScrollView 
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchLeaderboard} />
        }
      >
        {workers.map((worker, index) => (
          <TouchableOpacity 
            key={worker.id} 
            style={[
              styles.workerCard, 
              { backgroundColor: colors.card },
              index < 3 && styles.topThreeCard
            ]}
            onPress={() => handleProfilePress(worker)}
            activeOpacity={0.7}
          >
            <TouchableOpacity 
              style={styles.profilePhotoContainer}
              onPress={() => handleProfilePress(worker)}
              activeOpacity={0.8}
            >
              <ProfilePhoto 
                photoUrl={worker.profile_image_url}
                name={worker.name}
                rank={index + 1}
                size={45}
              />
            </TouchableOpacity>
            
            <View style={styles.workerInfo}>
              <Text style={[styles.workerName, { color: colors.text }]}>{worker.name}</Text>
              <Text style={[styles.workerOccupation, { color: colors.textSecondary }]}>{worker.occupation}</Text>
            </View>
            
            <View style={styles.stats}>
              <Text style={styles.totalTips}>KSh {worker.total_tips.toLocaleString()}</Text>
              <Text style={[styles.tipCount, { color: colors.textSecondary }]}>{worker.tip_count} tips</Text>
            </View>
          </TouchableOpacity>
        ))}
        
        {workers.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>No workers yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Be the first to join!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profilePhotoContainer: {
    marginRight: 12,
  },
  topThreeCard: {
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.semibold,
    marginBottom: 2,
  },
  workerOccupation: {
    fontSize: 12,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
  },

  stats: {
    alignItems: 'flex-end',
  },
  totalTips: {
    fontSize: 14,
    fontFamily: fonts.light,
    fontWeight: fontWeights.light,
    color: '#00C851',
    marginBottom: 2,
  },
  tipCount: {
    fontSize: 11,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
  },
})