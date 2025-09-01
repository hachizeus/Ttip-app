import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/theme-context'
import { MaterialIcons } from '@expo/vector-icons'
import { fonts, fontWeights } from '../../lib/fonts'

interface Worker {
  id: string
  name: string
  occupation: string
  total_tips: number
  tip_count: number
}

export default function LeaderboardScreen() {
  const { colors } = useTheme()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('id, name, occupation, total_tips, tip_count')
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
          <View key={worker.id} style={[
            styles.workerCard, 
            { backgroundColor: colors.card },
            index < 3 && styles.topThreeCard
          ]}>
            <View style={styles.rank}>
              <Text style={styles.rankText}>
                {getRankEmoji(index)}
              </Text>
            </View>
            
            <View style={styles.workerInfo}>
              <Text style={[styles.workerName, { color: colors.text }]}>{worker.name}</Text>
              <Text style={[styles.workerOccupation, { color: colors.textSecondary }]}>{worker.occupation}</Text>

            </View>
            
            <View style={styles.stats}>
              <Text style={styles.totalTips}>KSh {worker.total_tips.toLocaleString()}</Text>
              <Text style={[styles.tipCount, { color: colors.textSecondary }]}>{worker.tip_count} tips</Text>
            </View>
          </View>
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
  rank: {
    width: 35,
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
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