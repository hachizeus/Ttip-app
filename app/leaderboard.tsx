import React, { useState, useEffect } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { supabase, Worker } from '../lib/supabase'

export default function LeaderboardScreen() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('total_tips', { ascending: false })
        .limit(50)

      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderWorker = ({ item, index }: { item: Worker; index: number }) => (
    <View style={styles.workerCard}>
      <View style={styles.rank}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>
      <View style={styles.workerInfo}>
        <Text style={styles.workerName}>{item.name}</Text>
        <Text style={styles.workerOccupation}>{item.occupation}</Text>
      </View>
      <View style={styles.stats}>
        <Text style={styles.totalTips}>KSh {item.total_tips}</Text>
        <Text style={styles.tipCount}>{item.tip_count} tips</Text>
      </View>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading leaderboard...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Top Earners</Text>
      <FlatList
        data={workers}
        renderItem={renderWorker}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rank: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  workerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  workerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  workerOccupation: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  stats: {
    alignItems: 'flex-end',
  },
  totalTips: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00C851',
  },
  tipCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
})