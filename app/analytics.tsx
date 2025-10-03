  // ...existing code...
import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
    Dimensions,
    // PanResponder,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

import { MaterialIcons } from '@expo/vector-icons'
import { LineChart } from 'react-native-chart-kit'
import LoadingDots from '../components/LoadingDots'
import { getCurrentUser } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/theme-context'

import { fonts } from '../lib/fonts'

const screenWidth = Dimensions.get('window').width

export default function AnalyticsScreen() {
  const { colors } = useTheme()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [totalAmount, setTotalAmount] = useState(0)
  const [chartData, setChartData] = useState<any>(null)
  const [tipHistory, setTipHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showPeriodSelector, setShowPeriodSelector] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [currentMonth, selectedPeriod])

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await loadAnalytics()
    setRefreshing(false)
  }, [currentMonth, selectedPeriod])

  const generateChartData = (tips: any[], startDate: Date, endDate: Date) => {
    const labels = []
    const data = []
    
    if (selectedPeriod === 'month') {
      // Show last 7 days from today
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        
        const dayTips = tips.filter(tip => {
          const tipDate = new Date(tip.created_at)
          return tipDate.toDateString() === date.toDateString()
        })
        const dayTotal = dayTips.reduce((sum, tip) => sum + (parseFloat(tip.amount) || 0), 0)
        console.log(`📅 ${date.toDateString()}: ${dayTips.length} tips = ${dayTotal} KSh`)
        
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
        data.push(dayTotal)
      }
    } else {
      // Show monthly totals for longer periods
      const months = selectedPeriod === '3months' ? 3 : selectedPeriod === '6months' ? 6 : 12
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthTips = tips.filter(tip => {
          const tipDate = new Date(tip.created_at)
          return tipDate.getMonth() === date.getMonth() && tipDate.getFullYear() === date.getFullYear()
        })
        const monthTotal = monthTips.reduce((sum, tip) => sum + (parseFloat(tip.amount) || 0), 0)
        
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }))
        data.push(monthTotal)
      }
    }
    
    console.log('📈 Final chart data:', { labels, data })
    
    setChartData({
      labels,
      datasets: [{
        data: data.length > 0 ? data : [0],
        color: (opacity = 1) => `rgba(0, 200, 81, ${opacity})`,
        strokeWidth: 2
      }]
    })
  }

  const loadAnalytics = async () => {
    try {
      const phone = await getCurrentUser()
      if (!phone) return

      const { data: worker } = await supabase
        .from('workers')
        .select('worker_id, total_tips, tip_count')
        .eq('phone', phone)
        .single()

      if (!worker) return
      
      console.log('📊 Analytics worker data:', worker)

      let startDate, endDate
      
      if (selectedPeriod === 'month') {
        startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      } else if (selectedPeriod === '3months') {
        endDate = new Date()
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 3)
      } else if (selectedPeriod === '6months') {
        endDate = new Date()
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 6)
      } else { // 1year
        endDate = new Date()
        startDate = new Date()
        startDate.setFullYear(startDate.getFullYear() - 1)
      }

      // Get all transactions that are actually completed (have mpesa_tx_id)
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('worker_id', worker.worker_id)
        .not('mpesa_tx_id', 'is', null)
        .order('created_at', { ascending: false })
      
      console.log('📊 All transactions for worker:', allTransactions?.length || 0)
      console.log('📊 Sample transactions:', allTransactions?.slice(0, 3))
      
      // Filter by date range
      const tips = (allTransactions || []).filter(tx => {
        const txDate = new Date(tx.created_at)
        return txDate >= startDate && txDate <= endDate
      })
      
      console.log('📊 Filtered tips in date range:', tips.length)
      console.log('📊 Date range:', startDate.toISOString(), 'to', endDate.toISOString())

      if (tips) {
        const total = tips.reduce((sum, tip) => sum + (parseFloat(tip.amount) || 0), 0)
        console.log('📊 Analytics calculated total:', total, 'vs worker.total_tips:', worker.total_tips)
        console.log('📊 Tips found:', tips.length, 'transactions')
        
        // Use the actual database total_tips value for accuracy
        setTotalAmount(worker.total_tips || total)
        console.log('📈 Chart data - tips for chart:', tips.map(t => ({ amount: t.amount, date: t.created_at })))
        generateChartData(tips, startDate, endDate)
        setTipHistory(tips.map(tip => ({
          ...tip,
          amount: parseFloat(tip.amount) || 0,
          date: new Date(tip.created_at).toLocaleDateString(),
          time: new Date(tip.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })))
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getYAxisInterval = (maxValue: number) => {
    if (maxValue <= 100) return [0, 50, 100]
    if (maxValue <= 1000) return [0, 500, 1000]
    if (maxValue <= 5000) return [0, 1000, 2500, 5000]
    if (maxValue <= 16000) return [0, 5000, 10000, 15000, 20000]
    if (maxValue <= 50000) return [0, 15000, 25000, 50000]
    if (maxValue <= 100000) return [0, 25000, 50000, 75000, 100000]
    return [0, 25000, 50000, 75000, 100000]
  }

  const formatAmount = (amount: number) => {
    return `KSH. ${amount.toLocaleString()}`
  }

  const getPeriodDisplay = () => {
    if (selectedPeriod === 'month') {
      return currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()
    }
    const periodMap: Record<string, string> = {
      '3months': 'LAST 3 MONTHS',
      '6months': 'LAST 6 MONTHS', 
      '1year': 'LAST 12 MONTHS'
    }
    return periodMap[selectedPeriod as keyof typeof periodMap] || 'LAST 6 MONTHS'
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}> 
        <LoadingDots size={12} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <StatusBar 
        barStyle={colors.background === '#000000' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background}
      />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>MY EARNINGS</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Period Display */}
        <View style={[styles.totalSection, { backgroundColor: colors.background }]}>
          <TouchableOpacity 
            style={[styles.periodSelector, { backgroundColor: colors.background }]}
            onPress={() => setShowPeriodSelector(!showPeriodSelector)}
          >
            <Text style={[styles.periodText, { color: colors.textSecondary }]}>
              {getPeriodDisplay()}
            </Text>
            <MaterialIcons 
              name={showPeriodSelector ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
          <Text style={[styles.totalAmount, { color: colors.text }]}>{formatAmount(totalAmount)}</Text>
        </View>

        {/* Period Selector */}
        {showPeriodSelector && (
          <View style={[styles.periodOptions, { 
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.text,
            position: 'absolute',
            top: 140,
            left: 20,
            right: 20,
            zIndex: 1000
          }]}>
            {[
              { key: 'month', label: 'This Month' },
              { key: '3months', label: 'Last 3 Months' },
              { key: '6months', label: 'Last 6 Months' },
              { key: '1year', label: 'Last 12 Months' }
            ].map((option, index, array) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.periodOption,
                  { borderBottomColor: colors.border },
                  index === array.length - 1 && { borderBottomWidth: 0 },
                  selectedPeriod === option.key && { backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => {
                  setSelectedPeriod(option.key)
                  setShowPeriodSelector(false)
                }}
              >
                <Text style={[
                  styles.periodOptionText, 
                  { color: selectedPeriod === option.key ? colors.primary : colors.text }
                ]}>
                  {option.label}
                </Text>
                {selectedPeriod === option.key && (
                  <MaterialIcons name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Chart */}
        {chartData && (
          <View style={[styles.chartContainer, { backgroundColor: colors.background }]}>
            <LineChart
              data={chartData}
              width={screenWidth}
              height={220}
              chartConfig={{
                backgroundColor: colors.background,
                backgroundGradientFrom: colors.background,
                backgroundGradientTo: colors.background,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 200, 81, ${opacity})`,
                labelColor: (opacity = 1) => colors.textSecondary,
                style: {
                  borderRadius: 0,
                },
                propsForDots: {
                  r: '3',
                  strokeWidth: '2',
                  stroke: '#00C851'
                },
                fillShadowGradient: '#00C851',
                fillShadowGradientOpacity: colors.background === '#000000' ? 0.4 : 0.2,
                propsForLabels: {
                  fontSize: 11,
                },
                formatYLabel: (value) => {
                  const num = typeof value === 'string' ? parseFloat(value) : value;
                  if (num >= 1000) {
                    return `${Math.round(num / 1000)}K`;
                  }
                  return Math.round(num).toString();
                },
              }}
              style={styles.chart}
              withHorizontalLabels={true}
              withVerticalLabels={true}
              withInnerLines={false}
              withOuterLines={false}
              withShadow={false}
              fromZero={true}
              bezier
            />
          </View>
        )}

        {/* Tip History */}
        <View style={[styles.historyContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.historyTitle, { color: colors.text }]}>Tip History</Text>
          {tipHistory.length > 0 ? (
            tipHistory.map((tip, index) => (
              <View key={index} style={[
                styles.tipItem, 
                { 
                  borderBottomColor: colors.border,
                  backgroundColor: colors.background
                }
              ]}>
                <View style={styles.tipLeft}>
                  <View style={[styles.tipIcon, { backgroundColor: colors.primary }]}>
                    <MaterialIcons name="payments" size={20} color="#fff" />
                  </View>
                  <View style={styles.tipInfo}>
                    <Text style={[styles.tipAmount, { color: colors.text }]}>{formatAmount(tip.amount)}</Text>
                    <Text style={[styles.tipDate, { color: colors.textSecondary }]}>{tip.date} at {tip.time}</Text>
                  </View>
                </View>
                <View style={styles.tipRight}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: tip.status === 'completed' ? '#00C851' : '#FFC107' }
                  ]}>
                    <Text style={styles.statusText}>
                      {tip.status === 'completed' ? 'Received' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tips received yet</Text>
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.medium,
  fontWeight: '600',
    letterSpacing: 1.2,
  },
  totalSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  periodText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  fontWeight: '500',
    letterSpacing: 0.8,
    marginRight: 6,
  },
  totalAmount: {
    fontSize: 36,
    fontFamily: fonts.light,
  fontWeight: '300',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  periodOptions: {
    borderRadius: 12,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  periodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
  },
  periodOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  historyContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  historyTitle: {
    fontSize: 18,
    fontFamily: fonts.medium,
  fontWeight: '600',
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
  },
  tipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipInfo: {
    flex: 1,
  },
  tipAmount: {
    fontSize: 16,
    fontFamily: fonts.medium,
  fontWeight: '600',
    marginBottom: 4,
  },
  tipDate: {
    fontSize: 13,
    fontFamily: fonts.regular,
  fontWeight: '400',
  },
  tipRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  chartContainer: {
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  chart: {
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
})

