import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  FlatList,
} from 'react-native'
import { router } from 'expo-router'
import { LineChart } from 'react-native-chart-kit'
import { MaterialIcons } from '@expo/vector-icons'
import { getCurrentUser } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useTheme, ThemeProvider } from '../lib/theme-context'

const screenWidth = Dimensions.get('window').width

interface Transaction {
  id: string
  amount: number
  customer_phone: string
  created_at: string
  status: string
}

function AnalyticsContent() {
  const { colors } = useTheme()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [totalAmount, setTotalAmount] = useState(0)
  const [chartData, setChartData] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [currentMonth])

  const loadAnalytics = async () => {
    try {
      const phone = await getCurrentUser()
      if (!phone) return

      // Get worker data
      const { data: worker } = await supabase
        .from('workers')
        .select('worker_id, total_tips')
        .eq('phone', phone)
        .single()

      if (!worker) return

      // Calculate month range
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      const days = endDate.getDate()

      // Get tips data
      const { data: tips } = await supabase
        .from('tips')
        .select('*')
        .eq('worker_id', worker.worker_id)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      if (tips) {
        setTransactions(tips)
        const monthTotal = tips.reduce((sum, tip) => sum + (parseFloat(tip.amount) || 0), 0)
        setTotalAmount(monthTotal)
        generateChartData(tips, days)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateChartData = (tips: any[], days: number) => {
    const labels = []
    const data = []
    
    // Create daily buckets for current month
    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const totalDays = endDate.getDate()
    
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const dateStr = date.toISOString().split('T')[0]
      
      // Sum tips for this day
      const dayTips = tips.filter(tip => 
        tip.created_at && tip.created_at.split('T')[0] === dateStr
      )
      const dayTotal = dayTips.reduce((sum, tip) => sum + (parseFloat(tip.amount) || 0), 0)
      
      labels.push(day.toString())
      data.push(dayTotal)
    }

    // Only show chart if there's data
    if (data.some(val => val > 0)) {
      setChartData({
        labels,
        datasets: [{
          data,
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          strokeWidth: 2
        }]
      })
    } else {
      setChartData(null)
    }
  }

  const getAmountRangeStats = () => {
    const ranges = [
      { label: 'KSh 0-50', min: 0, max: 50, count: 0, total: 0 },
      { label: 'KSh 51-100', min: 51, max: 100, count: 0, total: 0 },
      { label: 'KSh 101-200', min: 101, max: 200, count: 0, total: 0 },
      { label: 'KSh 201-500', min: 201, max: 500, count: 0, total: 0 },
      { label: 'KSh 500+', min: 501, max: Infinity, count: 0, total: 0 }
    ]

    transactions.forEach(tip => {
      const amount = tip.amount
      const range = ranges.find(r => amount >= r.min && amount <= r.max)
      if (range) {
        range.count++
        range.total += amount
      }
    })

    return ranges.filter(r => r.count > 0)
  }

  const formatAmount = (amount: number) => {
    return `KSh ${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionIcon}>
        <MaterialIcons name="arrow-downward" size={20} color="#00C851" />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={[styles.transactionTitle, { color: colors.text }]}>Tip Received</Text>
        <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={styles.transactionAmount}>+{formatAmount(item.amount)}</Text>
    </View>
  )

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Loading analytics...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Top Section */}
      <View style={[styles.fixedSection, { backgroundColor: colors.background, marginTop: 60 }]}>

        {/* Total Amount Card */}
        <View style={[styles.totalCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>TOTAL EARNINGS</Text>
          <Text style={[styles.totalAmount, { color: colors.text }]}>{formatAmount(totalAmount)}</Text>
        </View>

        {/* Month Navigator */}
        <View style={[styles.monthNavigator, { backgroundColor: colors.background }]}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => {
              const prevMonth = new Date(currentMonth)
              prevMonth.setMonth(prevMonth.getMonth() - 1)
              setCurrentMonth(prevMonth)
            }}
          >
            <MaterialIcons name="chevron-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: colors.text }]}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => {
              const nextMonth = new Date(currentMonth)
              nextMonth.setMonth(nextMonth.getMonth() + 1)
              setCurrentMonth(nextMonth)
            }}
          >
            <MaterialIcons name="chevron-right" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* Chart */}
        <View style={[styles.chartContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Daily Earnings - {currentMonth.toLocaleDateString('en-US', { month: 'long' })}</Text>
          {chartData ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartScrollContent}
              style={styles.chartScroll}
            >
              <LineChart
                data={chartData}
                width={screenWidth - 48}
                height={180}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: 'transparent',
                  backgroundGradientTo: 'transparent',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                  labelColor: (opacity = 1) => colors.textSecondary,
                  style: {
                    borderRadius: 0,
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: '#007AFF'
                  },
                  fillShadowGradient: '#007AFF',
                  fillShadowGradientOpacity: 0.1,
                  propsForLabels: {
                    fontSize: 10,
                  },
                  formatYLabel: (value) => `${Math.round(value)}`,
                }}
                style={styles.chart}
                withHorizontalLabels={true}
                withVerticalLabels={true}
                withInnerLines={false}
                withOuterLines={false}
                withShadow={false}
                fromZero={true}
              />
            </ScrollView>
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="show-chart" size={48} color={colors.textSecondary} />
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>No earnings data for this month</Text>
            </View>
          )}
        </View>

        {/* Amount Range Statistics */}
        <View style={[styles.rangeStatsContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tip Amount Breakdown</Text>
          {getAmountRangeStats().map((range, index) => (
            <View key={index} style={styles.rangeItem}>
              <View style={styles.rangeInfo}>
                <Text style={[styles.rangeLabel, { color: colors.text }]}>{range.label}</Text>
                <Text style={[styles.rangeCount, { color: colors.textSecondary }]}>{range.count} tips</Text>
              </View>
              <Text style={[styles.rangeTotal, { color: colors.primary }]}>KSh {range.total.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Quick Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.background }]}>
            <MaterialIcons name="trending-up" size={24} color="#00C851" />
            <Text style={[styles.statValue, { color: colors.text }]}>{transactions.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Tips</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.background }]}>
            <MaterialIcons name="attach-money" size={24} color="#007AFF" />
            <Text style={[styles.statValue, { color: colors.text }]}>KSh {Math.round(totalAmount / Math.max(transactions.length, 1)).toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Tip</Text>
          </View>
        </View>

        {/* Transactions History */}
        <View style={[styles.transactionsSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          <FlatList
            data={transactions.slice(0, 10)}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  fixedSection: {
    padding: 12,
    paddingBottom: 0,
  },

  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  totalCard: {
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  totalLabel: {
    fontSize: 12,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartContainer: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  chartScroll: {
    marginHorizontal: -8,
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  chartScrollContent: {
    paddingHorizontal: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  rangeStatsContainer: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rangeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rangeInfo: {
    flex: 1,
  },
  rangeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  rangeCount: {
    fontSize: 14,
    marginTop: 2,
  },
  rangeTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionsSection: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00C851',
  },
});

export default function AnalyticsScreen() {
  return (
    <ThemeProvider>
      <AnalyticsContent />
    </ThemeProvider>
  )
}