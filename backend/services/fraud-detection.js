import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export class FraudDetectionService {
    constructor() {
        this.rules = [
            { name: 'high_amount', threshold: 10000, weight: 0.3 },
            { name: 'frequent_transactions', threshold: 5, timeWindow: 3600000, weight: 0.4 }, // 1 hour
            { name: 'velocity_check', threshold: 3, timeWindow: 300000, weight: 0.3 }, // 5 minutes
            { name: 'suspicious_pattern', weight: 0.5 }
        ];
        this.fraudThreshold = 0.7; // Flag if score > 0.7
    }

    async checkTransaction({ workerId, amount, customerPhone, customerEmail, method }) {
        let fraudScore = 0;
        const reasons = [];

        try {
            // Rule 1: High Amount Check
            if (amount > this.rules[0].threshold) {
                fraudScore += this.rules[0].weight;
                reasons.push(`High amount: KSh ${amount}`);
            }

            // Rule 2: Frequent Transactions from Same Customer
            const recentTransactions = await this.getRecentTransactions(
                customerPhone || customerEmail,
                this.rules[1].timeWindow
            );

            if (recentTransactions.length >= this.rules[1].threshold) {
                fraudScore += this.rules[1].weight;
                reasons.push(`${recentTransactions.length} transactions in last hour`);
            }

            // Rule 3: Velocity Check (multiple transactions in short time)
            const veryRecentTransactions = await this.getRecentTransactions(
                customerPhone || customerEmail,
                this.rules[2].timeWindow
            );

            if (veryRecentTransactions.length >= this.rules[2].threshold) {
                fraudScore += this.rules[2].weight;
                reasons.push(`${veryRecentTransactions.length} transactions in 5 minutes`);
            }

            // Rule 4: Suspicious Pattern Detection
            const suspiciousScore = await this.checkSuspiciousPatterns(workerId, customerPhone, amount);
            if (suspiciousScore > 0) {
                fraudScore += suspiciousScore * this.rules[3].weight;
                reasons.push('Suspicious transaction pattern detected');
            }

            // Rule 5: Blacklist Check
            const isBlacklisted = await this.checkBlacklist(customerPhone || customerEmail);
            if (isBlacklisted) {
                fraudScore = 1.0; // Immediate flag
                reasons.push('Customer is blacklisted');
            }

            // Rule 6: Geographic Anomaly (if we have location data)
            // This would require additional location tracking

            const flagged = fraudScore > this.fraudThreshold;

            // Log fraud check
            await this.logFraudCheck({
                workerId,
                customerPhone,
                customerEmail,
                amount,
                method,
                fraudScore,
                flagged,
                reasons: reasons.join(', ')
            });

            return {
                flagged,
                score: Math.min(fraudScore, 1.0),
                reason: reasons.join(', ') || 'No fraud indicators detected'
            };

        } catch (error) {
            console.error('Fraud detection error:', error);
            // Fail safe - don't block transactions on fraud detection errors
            return {
                flagged: false,
                score: 0,
                reason: 'Fraud detection unavailable'
            };
        }
    }

    async getRecentTransactions(customerIdentifier, timeWindow) {
        const cutoffTime = new Date(Date.now() - timeWindow).toISOString();

        const { data: transactions } = await supabase
            .from('transactions')
            .select('id, created_at, amount')
            .or(`customer_number.eq.${customerIdentifier},customer_email.eq.${customerIdentifier}`)
            .gte('created_at', cutoffTime)
            .order('created_at', { ascending: false });

        return transactions || [];
    }

    async checkSuspiciousPatterns(workerId, customerPhone, amount) {
        let suspiciousScore = 0;

        try {
            // Pattern 1: Same customer tipping same worker multiple times rapidly
            const { data: workerTransactions } = await supabase
                .from('transactions')
                .select('id, created_at, amount')
                .eq('worker_id', workerId)
                .eq('customer_number', customerPhone)
                .gte('created_at', new Date(Date.now() - 86400000).toISOString()) // Last 24 hours
                .order('created_at', { ascending: false });

            if (workerTransactions && workerTransactions.length > 3) {
                suspiciousScore += 0.3;
            }

            // Pattern 2: Round number amounts (often indicates testing)
            if (amount % 100 === 0 && amount >= 1000) {
                suspiciousScore += 0.2;
            }

            // Pattern 3: Unusual time patterns (e.g., many transactions at 3 AM)
            const hour = new Date().getHours();
            if (hour >= 2 && hour <= 5) {
                suspiciousScore += 0.1;
            }

            return suspiciousScore;

        } catch (error) {
            console.error('Pattern detection error:', error);
            return 0;
        }
    }

    async checkBlacklist(customerIdentifier) {
        try {
            const { data: blacklistEntry } = await supabase
                .from('fraud_blacklist')
                .select('id')
                .eq('identifier', customerIdentifier)
                .eq('active', true)
                .single();

            return !!blacklistEntry;
        } catch (error) {
            return false;
        }
    }

    async logFraudCheck(checkData) {
        try {
            await supabase
                .from('fraud_checks')
                .insert({
                    worker_id: checkData.workerId,
                    customer_phone: checkData.customerPhone,
                    customer_email: checkData.customerEmail,
                    amount: checkData.amount,
                    payment_method: checkData.method,
                    fraud_score: checkData.fraudScore,
                    flagged: checkData.flagged,
                    reasons: checkData.reasons,
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Failed to log fraud check:', error);
        }
    }

    // Admin functions for managing fraud rules
    async addToBlacklist(identifier, reason, adminId) {
        try {
            await supabase
                .from('fraud_blacklist')
                .insert({
                    identifier,
                    reason,
                    added_by: adminId,
                    active: true,
                    created_at: new Date().toISOString()
                });

            return { success: true };
        } catch (error) {
            console.error('Failed to add to blacklist:', error);
            return { success: false, error: error.message };
        }
    }

    async removeFromBlacklist(identifier, adminId) {
        try {
            await supabase
                .from('fraud_blacklist')
                .update({ 
                    active: false, 
                    removed_by: adminId,
                    removed_at: new Date().toISOString()
                })
                .eq('identifier', identifier);

            return { success: true };
        } catch (error) {
            console.error('Failed to remove from blacklist:', error);
            return { success: false, error: error.message };
        }
    }

    async getFraudStats(timeRange = '24h') {
        try {
            let cutoffTime;
            switch (timeRange) {
                case '1h':
                    cutoffTime = new Date(Date.now() - 3600000);
                    break;
                case '24h':
                    cutoffTime = new Date(Date.now() - 86400000);
                    break;
                case '7d':
                    cutoffTime = new Date(Date.now() - 604800000);
                    break;
                default:
                    cutoffTime = new Date(Date.now() - 86400000);
            }

            const { data: checks } = await supabase
                .from('fraud_checks')
                .select('flagged, fraud_score, amount')
                .gte('created_at', cutoffTime.toISOString());

            const totalChecks = checks?.length || 0;
            const flaggedChecks = checks?.filter(c => c.flagged).length || 0;
            const avgFraudScore = checks?.reduce((sum, c) => sum + c.fraud_score, 0) / totalChecks || 0;
            const totalFlaggedAmount = checks?.filter(c => c.flagged).reduce((sum, c) => sum + c.amount, 0) || 0;

            return {
                totalChecks,
                flaggedChecks,
                flaggedPercentage: totalChecks > 0 ? (flaggedChecks / totalChecks * 100).toFixed(2) : 0,
                avgFraudScore: avgFraudScore.toFixed(3),
                totalFlaggedAmount,
                timeRange
            };
        } catch (error) {
            console.error('Failed to get fraud stats:', error);
            return null;
        }
    }

    // ML Integration Stub
    async trainFraudModel() {
        // This would integrate with a machine learning service
        // For now, it's a placeholder for future ML implementation
        console.log('ML fraud model training initiated...');
        
        try {
            // Get historical fraud data
            const { data: trainingData } = await supabase
                .from('fraud_checks')
                .select('*')
                .limit(10000)
                .order('created_at', { ascending: false });

            // In a real implementation, this would:
            // 1. Send data to ML service (AWS SageMaker, Google ML, etc.)
            // 2. Train model on features like amount, time patterns, frequency
            // 3. Update fraud detection rules based on model insights
            
            console.log(`Training data collected: ${trainingData?.length || 0} records`);
            
            return {
                success: true,
                message: 'ML training initiated',
                dataPoints: trainingData?.length || 0
            };
        } catch (error) {
            console.error('ML training error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}