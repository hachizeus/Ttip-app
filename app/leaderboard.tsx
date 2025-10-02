import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { supabase, Worker } from '../lib/supabase'

export default function LeaderboardScreen() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchLeaderboard()
    setRefreshing(false)
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>
        <Text>Loading leaderboard...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
      </View>
      <Text style={styles.title}>🏆 Top Earners</Text>
      <FlatList
        data={workers}
        renderItem={renderWorker}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
    gap: 12,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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