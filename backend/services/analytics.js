import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export class AnalyticsService {
    constructor() {
        this.eventQueue = [];
        this.isProcessing = false;
    }

    startEventProcessing() {
        // Process events every 10 seconds
        setInterval(() => {
            this.processEventQueue();
        }, 10000);

        console.log('Analytics event processing started');
    }

    // Event Tracking
    trackEvent(eventType, data) {
        const event = {
            type: eventType,
            data: data,
            timestamp: new Date().toISOString(),
            session_id: this.generateSessionId()
        };

        this.eventQueue.push(event);

        // Process immediately if queue is getting large
        if (this.eventQueue.length > 100) {
            this.processEventQueue();
        }
    }

    async processEventQueue() {
        if (this.isProcessing || this.eventQueue.length === 0) return;

        this.isProcessing = true;

        try {
            const events = this.eventQueue.splice(0, 50); // Process in batches of 50

            await supabase
                .from('analytics_events')
                .insert(events);

            console.log(`Processed ${events.length} analytics events`);

        } catch (error) {
            console.error('Failed to process analytics events:', error);
            // Put events back in queue for retry
            this.eventQueue.unshift(...events);
        } finally {
            this.isProcessing = false;
        }
    }

    // Dashboard Analytics
    async getDashboardData(timeRange = '24h') {
        try {
            const cutoffTime = this.getCutoffTime(timeRange);

            // Get transaction stats
            const transactionStats = await this.getTransactionStats(cutoffTime);
            
            // Get payment method breakdown
            const paymentMethods = await this.getPaymentMethodStats(cutoffTime);
            
            // Get worker performance
            const workerStats = await this.getWorkerStats(cutoffTime);
            
            // Get fraud stats
            const fraudStats = await this.getFraudStats(cutoffTime);
            
            // Get revenue stats
            const revenueStats = await this.getRevenueStats(cutoffTime);

            return {
                timeRange,
                transactions: transactionStats,
                paymentMethods,
                workers: workerStats,
                fraud: fraudStats,
                revenue: revenueStats,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Dashboard data error:', error);
            throw error;
        }
    }

    async getTransactionStats(cutoffTime) {
        const { data: transactions } = await supabase
            .from('transactions')
            .select('status, amount, created_at, gateway')
            .gte('created_at', cutoffTime);

        const total = transactions?.length || 0;
        const completed = transactions?.filter(t => t.status === 'COMPLETED').length || 0;
        const pending = transactions?.filter(t => t.status === 'PENDING').length || 0;
        const failed = transactions?.filter(t => t.status === 'FAILED').length || 0;

        const totalAmount = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
        const avgAmount = total > 0 ? totalAmount / total : 0;

        return {
            total,
            completed,
            pending,
            failed,
            completionRate: total > 0 ? (completed / total * 100).toFixed(2) : 0,
            totalAmount,
            avgAmount: avgAmount.toFixed(2)
        };
    }

    async getPaymentMethodStats(cutoffTime) {
        const { data: transactions } = await supabase
            .from('transactions')
            .select('gateway, amount')
            .gte('created_at', cutoffTime)
            .eq('status', 'COMPLETED');

        const methodStats = {};

        transactions?.forEach(t => {
            if (!methodStats[t.gateway]) {
                methodStats[t.gateway] = { count: 0, amount: 0 };
            }
            methodStats[t.gateway].count++;
            methodStats[t.gateway].amount += t.amount || 0;
        });

        return Object.entries(methodStats).map(([method, stats]) => ({
            method,
            count: stats.count,
            amount: stats.amount,
            percentage: transactions?.length > 0 ? (stats.count / transactions.length * 100).toFixed(2) : 0
        }));
    }

    async getWorkerStats(cutoffTime) {
        const { data: transactions } = await supabase
            .from('transactions')
            .select(`
                worker_id,
                amount,
                status,
                workers(name)
            `)
            .gte('created_at', cutoffTime)
            .eq('status', 'COMPLETED');

        const workerStats = {};

        transactions?.forEach(t => {
            if (!workerStats[t.worker_id]) {
                workerStats[t.worker_id] = {
                    workerId: t.worker_id,
                    workerName: t.workers?.name || 'Unknown',
                    count: 0,
                    totalAmount: 0
                };
            }
            workerStats[t.worker_id].count++;
            workerStats[t.worker_id].totalAmount += t.amount || 0;
        });

        return Object.values(workerStats)
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 10); // Top 10 workers
    }

    async getFraudStats(cutoffTime) {
        const { data: fraudChecks } = await supabase
            .from('fraud_checks')
            .select('flagged, fraud_score, amount')
            .gte('created_at', cutoffTime);

        const total = fraudChecks?.length || 0;
        const flagged = fraudChecks?.filter(f => f.flagged).length || 0;
        const avgScore = total > 0 ? fraudChecks.reduce((sum, f) => sum + f.fraud_score, 0) / total : 0;
        const flaggedAmount = fraudChecks?.filter(f => f.flagged).reduce((sum, f) => sum + f.amount, 0) || 0;

        return {
            totalChecks: total,
            flaggedCount: flagged,
            flaggedPercentage: total > 0 ? (flagged / total * 100).toFixed(2) : 0,
            avgFraudScore: avgScore.toFixed(3),
            flaggedAmount
        };
    }

    async getRevenueStats(cutoffTime) {
        const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, created_at')
            .gte('created_at', cutoffTime)
            .eq('status', 'COMPLETED')
            .order('created_at', { ascending: true });

        if (!transactions || transactions.length === 0) {
            return {
                total: 0,
                daily: [],
                growth: 0
            };
        }

        const total = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

        // Group by day for daily revenue
        const dailyRevenue = {};
        transactions.forEach(t => {
            const date = new Date(t.created_at).toISOString().split('T')[0];
            if (!dailyRevenue[date]) {
                dailyRevenue[date] = 0;
            }
            dailyRevenue[date] += t.amount || 0;
        });

        const daily = Object.entries(dailyRevenue).map(([date, amount]) => ({
            date,
            amount
        }));

        // Calculate growth (compare first and last day)
        const growth = daily.length > 1 
            ? ((daily[daily.length - 1].amount - daily[0].amount) / daily[0].amount * 100).toFixed(2)
            : 0;

        return {
            total,
            daily,
            growth
        };
    }

    // ML Analytics (for future ML integration)
    async generateMLInsights() {
        try {
            // Get data for ML analysis
            const { data: transactions } = await supabase
                .from('transactions')
                .select(`
                    amount,
                    created_at,
                    status,
                    gateway,
                    worker_id,
                    fraud_checks(fraud_score, flagged)
                `)
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
                .limit(10000);

            // Analyze patterns
            const insights = {
                tipSuggestions: this.analyzeTipPatterns(transactions),
                fraudPatterns: this.analyzeFraudPatterns(transactions),
                workerPerformance: this.analyzeWorkerPerformance(transactions),
                timePatterns: this.analyzeTimePatterns(transactions)
            };

            // Store insights
            await supabase
                .from('ml_insights')
                .insert({
                    insights: insights,
                    generated_at: new Date().toISOString(),
                    data_points: transactions?.length || 0
                });

            return insights;

        } catch (error) {
            console.error('ML insights generation error:', error);
            throw error;
        }
    }

    analyzeTipPatterns(transactions) {
        if (!transactions || transactions.length === 0) return {};

        const amounts = transactions
            .filter(t => t.status === 'COMPLETED')
            .map(t => t.amount);

        const avgTip = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const medianTip = amounts.sort((a, b) => a - b)[Math.floor(amounts.length / 2)];
        
        // Find common tip amounts
        const amountFreq = {};
        amounts.forEach(amount => {
            amountFreq[amount] = (amountFreq[amount] || 0) + 1;
        });

        const popularAmounts = Object.entries(amountFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([amount, count]) => ({ amount: parseInt(amount), count }));

        return {
            avgTip: avgTip.toFixed(2),
            medianTip,
            popularAmounts,
            suggestions: [
                Math.round(avgTip * 0.5),
                Math.round(avgTip),
                Math.round(avgTip * 1.5)
            ]
        };
    }

    analyzeFraudPatterns(transactions) {
        const fraudData = transactions
            .filter(t => t.fraud_checks && t.fraud_checks.length > 0)
            .map(t => ({
                amount: t.amount,
                fraudScore: t.fraud_checks[0].fraud_score,
                flagged: t.fraud_checks[0].flagged,
                hour: new Date(t.created_at).getHours()
            }));

        if (fraudData.length === 0) return {};

        const avgFraudScore = fraudData.reduce((sum, f) => sum + f.fraudScore, 0) / fraudData.length;
        
        // Analyze by hour
        const hourlyFraud = {};
        fraudData.forEach(f => {
            if (!hourlyFraud[f.hour]) {
                hourlyFraud[f.hour] = { total: 0, flagged: 0 };
            }
            hourlyFraud[f.hour].total++;
            if (f.flagged) hourlyFraud[f.hour].flagged++;
        });

        const riskiestHours = Object.entries(hourlyFraud)
            .map(([hour, data]) => ({
                hour: parseInt(hour),
                riskRate: data.total > 0 ? (data.flagged / data.total * 100).toFixed(2) : 0
            }))
            .sort((a, b) => b.riskRate - a.riskRate)
            .slice(0, 3);

        return {
            avgFraudScore: avgFraudScore.toFixed(3),
            riskiestHours
        };
    }

    analyzeWorkerPerformance(transactions) {
        const workerData = {};

        transactions
            .filter(t => t.status === 'COMPLETED')
            .forEach(t => {
                if (!workerData[t.worker_id]) {
                    workerData[t.worker_id] = {
                        tips: [],
                        totalAmount: 0,
                        count: 0
                    };
                }
                workerData[t.worker_id].tips.push(t.amount);
                workerData[t.worker_id].totalAmount += t.amount;
                workerData[t.worker_id].count++;
            });

        const topPerformers = Object.entries(workerData)
            .map(([workerId, data]) => ({
                workerId,
                avgTip: data.totalAmount / data.count,
                totalTips: data.count,
                totalAmount: data.totalAmount
            }))
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 5);

        return { topPerformers };
    }

    analyzeTimePatterns(transactions) {
        const hourlyData = {};
        const dailyData = {};

        transactions.forEach(t => {
            const date = new Date(t.created_at);
            const hour = date.getHours();
            const day = date.getDay(); // 0 = Sunday

            if (!hourlyData[hour]) hourlyData[hour] = 0;
            if (!dailyData[day]) dailyData[day] = 0;

            hourlyData[hour]++;
            dailyData[day]++;
        });

        const peakHours = Object.entries(hourlyData)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }));

        const peakDays = Object.entries(dailyData)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([day, count]) => ({ 
                day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
                count 
            }));

        return { peakHours, peakDays };
    }

    // Utility functions
    getCutoffTime(timeRange) {
        const now = new Date();
        switch (timeRange) {
            case '1h':
                return new Date(now - 3600000).toISOString();
            case '24h':
                return new Date(now - 86400000).toISOString();
            case '7d':
                return new Date(now - 604800000).toISOString();
            case '30d':
                return new Date(now - 2592000000).toISOString();
            default:
                return new Date(now - 86400000).toISOString();
        }
    }

    generateSessionId() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }
}