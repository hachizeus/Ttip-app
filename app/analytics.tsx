import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { LineChart } from 'react-native-chart-kit'
import { MaterialIcons } from '@expo/vector-icons'
import { getCurrentUser } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useTheme, ThemeProvider } from '../lib/theme-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { fonts, fontWeights } from '../lib/fonts'

const screenWidth = Dimensions.get('window').width

function AnalyticsContent() {
  const { colors } = useTheme()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [totalAmount, setTotalAmount] = useState(0)
  const [chartData, setChartData] = useState<any>(null)
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showPeriodSelector, setShowPeriodSelector] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [currentMonth, selectedPeriod])

  const loadAnalytics = async () => {
    try {
      const phone = await getCurrentUser()
      if (!phone) return

      const { data: worker } = await supabase
        .from('workers')
        .select('worker_id')
        .eq('phone', phone)
        .single()

      if (!worker) return

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

      const { data: tips } = await supabase
        .from('tips')
        .select('*')
        .eq('worker_id', worker.worker_id)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true })

      if (tips) {
        const total = tips.reduce((sum, tip) => sum + (parseFloat(tip.amount) || 0), 0)
        setTotalAmount(total)
        generateChartData(tips, startDate, endDate)
        generateCategoryData(tips, total)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateChartData = (tips: any[], startDate: Date, endDate: Date) => {
    const labels = []
    const data = []
    
    if (selectedPeriod === 'month') {
      // Weekly intervals for month view
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
      weeks.forEach((week, index) => {
        const weekStart = new Date(startDate)
        weekStart.setDate(weekStart.getDate() + (index * 7))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        
        const weekTips = tips.filter(tip => {
          const tipDate = new Date(tip.created_at)
          return tipDate >= weekStart && tipDate <= weekEnd
        })
        
        const weekTotal = weekTips.reduce((sum, tip) => sum + (parseFloat(tip.amount) || 0), 0)
        labels.push(week)
        data.push(weekTotal)
      })
    } else {
      // Monthly intervals for 3months, 6months, 1year
      const current = new Date(startDate)
      while (current <= endDate) {
        const monthStr = current.toLocaleDateString('en-US', { month: 'short' })
        const year = current.getFullYear()
        const month = current.getMonth()
        
        const monthTips = tips.filter(tip => {
          const tipDate = new Date(tip.created_at)
          return tipDate.getFullYear() === year && tipDate.getMonth() === month
        })
        
        const monthTotal = monthTips.reduce((sum, tip) => sum + (parseFloat(tip.amount) || 0), 0)
        labels.push(monthStr)
        data.push(monthTotal)
        current.setMonth(current.getMonth() + 1)
      }
    }

    setChartData({
      labels,
      datasets: [{
        data,
        color: (opacity = 1) => `rgba(0, 200, 81, ${opacity})`,
        strokeWidth: 3
      }]
    })
  }

  const generateCategoryData = (tips: any[], total: number) => {
    const categories = [
      { 
        name: 'SMALL TIPS', 
        icon: '💰', 
        color: '#FF6B35',
        range: [1, 50],
        amount: 0,
        percentage: 0
      },
      { 
        name: 'MEDIUM TIPS', 
        icon: '👥', 
        color: '#007AFF',
        range: [51, 200],
        amount: 0,
        percentage: 0
      },
      { 
        name: 'LARGE TIPS', 
        icon: '🎯', 
        color: '#FF3B82',
        range: [201, 500],
        amount: 0,
        percentage: 0
      },
      { 
        name: 'PREMIUM TIPS', 
        icon: '💎', 
        color: '#8B5CF6',
        range: [501, Infinity],
        amount: 0,
        percentage: 0
      }
    ]

    tips.forEach(tip => {
      const amount = parseFloat(tip.amount) || 0
      categories.forEach(category => {
        if (amount >= category.range[0] && amount <= category.range[1]) {
          category.amount += amount
        }
      })
    })

    categories.forEach(category => {
      category.percentage = total > 0 ? Math.round((category.amount / total) * 100) : 0
    })

    setCategoryData(categories.filter(c => c.amount > 0))
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
    const periodMap = {
      '3months': 'LAST 3 MONTHS',
      '6months': 'LAST 6 MONTHS', 
      '1year': 'LAST 12 MONTHS'
    }
    return periodMap[selectedPeriod] || 'LAST 6 MONTHS'
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Loading analytics...</Text>
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

      <ScrollView showsVerticalScrollIndicator={false}>
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
            shadowColor: colors.text
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
                  if (value >= 1000) {
                    return `${Math.round(value / 1000)}K`
                  }
                  return Math.round(value).toString()
                },
              }}
              style={[styles.chart, { backgroundColor: colors.background }]}
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

        {/* Categories */}
        <View style={[styles.categoriesContainer, { backgroundColor: colors.background }]}>
          {categoryData.map((category, index) => (
            <View key={index} style={[
              styles.categoryItem, 
              { 
                borderBottomColor: colors.border,
                backgroundColor: colors.background
              }
            ]}>
              <View style={styles.categoryLeft}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                  <Text style={styles.categoryEmoji}>{category.icon}</Text>
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
                  <Text style={[styles.categoryAmount, { color: colors.textSecondary }]}>{formatAmount(category.amount)}</Text>
                </View>
              </View>
              <View style={styles.categoryRight}>
                <Text style={[styles.categoryPercentage, { color: colors.text }]}>{category.percentage}%</Text>
                <View style={[
                  styles.percentageBar,
                  { backgroundColor: colors.border }
                ]}>
                  <View style={[
                    styles.percentageFill,
                    { 
                      backgroundColor: category.color,
                      width: `${category.percentage}%`
                    }
                  ]} />
                </View>
              </View>
            </View>
          ))}
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
    fontWeight: fontWeights.semibold,
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
    fontWeight: fontWeights.medium,
    letterSpacing: 0.8,
    marginRight: 6,
  },
  totalAmount: {
    fontSize: 36,
    fontFamily: fonts.light,
    fontWeight: fontWeights.light,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  periodOptions: {
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
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
  chartContainer: {
    marginBottom: 30,
    marginLeft: -20,
    paddingVertical: 10,
  },
  chart: {
    borderRadius: 0,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.semibold,
    marginBottom: 4,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '400',
  },
  categoryRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  categoryPercentage: {
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    marginBottom: 8,
  },
  percentageBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  percentageFill: {
    height: '100%',
    borderRadius: 2,
  },
})

export default function AnalyticsScreen() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AnalyticsContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}