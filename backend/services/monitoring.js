import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export class MonitoringService {
    constructor() {
        this.metrics = {
            requests: 0,
            errors: 0,
            payments: 0,
            payouts: 0,
            fraudFlags: 0,
            uptime: Date.now()
        };
        
        this.healthChecks = new Map();
        this.alerts = [];
    }

    // Health Monitoring
    startHealthChecks() {
        // Check database connection every 30 seconds
        setInterval(async () => {
            await this.checkDatabaseHealth();
        }, 30000);

        // Check external services every 60 seconds
        setInterval(async () => {
            await this.checkExternalServices();
        }, 60000);

        // Clean up old logs every hour
        setInterval(async () => {
            await this.cleanupOldLogs();
        }, 3600000);

        console.log('Health checks started');
    }

    async checkDatabaseHealth() {
        try {
            const start = Date.now();
            const { data, error } = await supabase
                .from('workers')
                .select('count')
                .limit(1);

            const responseTime = Date.now() - start;

            this.healthChecks.set('database', {
                status: error ? 'unhealthy' : 'healthy',
                responseTime: responseTime,
                lastCheck: new Date().toISOString(),
                error: error?.message
            });

            if (responseTime > 5000) { // 5 seconds
                this.createAlert('database_slow', `Database response time: ${responseTime}ms`);
            }

        } catch (error) {
            this.healthChecks.set('database', {
                status: 'unhealthy',
                lastCheck: new Date().toISOString(),
                error: error.message
            });

            this.createAlert('database_error', error.message);
        }
    }

    async checkExternalServices() {
        // Check M-Pesa API
        try {
            const start = Date.now();
            // This would be a lightweight ping to M-Pesa
            // For now, we'll simulate it
            const responseTime = Date.now() - start;

            this.healthChecks.set('mpesa', {
                status: 'healthy',
                responseTime: responseTime,
                lastCheck: new Date().toISOString()
            });

        } catch (error) {
            this.healthChecks.set('mpesa', {
                status: 'unhealthy',
                lastCheck: new Date().toISOString(),
                error: error.message
            });
        }

        // Check other payment gateways
        // Similar checks for Stripe, PayPal, etc.
    }

    getHealthStatus() {
        const uptime = Date.now() - this.metrics.uptime;
        
        return {
            status: 'OK',
            uptime: Math.floor(uptime / 1000), // seconds
            timestamp: new Date().toISOString(),
            services: Object.fromEntries(this.healthChecks),
            metrics: {
                ...this.metrics,
                requestsPerMinute: this.calculateRequestsPerMinute(),
                errorRate: this.calculateErrorRate()
            },
            alerts: this.alerts.slice(-10) // Last 10 alerts
        };
    }

    // Metrics Collection
    incrementMetric(metric) {
        if (this.metrics.hasOwnProperty(metric)) {
            this.metrics[metric]++;
        }
    }

    recordResponseTime(endpoint, responseTime) {
        // Store response times for analysis
        // In production, this would go to a time-series database
        console.log(`${endpoint}: ${responseTime}ms`);
    }

    calculateRequestsPerMinute() {
        // This would calculate based on stored timestamps
        // For now, return a placeholder
        return Math.floor(this.metrics.requests / ((Date.now() - this.metrics.uptime) / 60000));
    }

    calculateErrorRate() {
        if (this.metrics.requests === 0) return 0;
        return (this.metrics.errors / this.metrics.requests * 100).toFixed(2);
    }

    // Logging
    async logError(type, error, context = {}) {
        try {
            const logEntry = {
                type: type,
                message: error.message || error,
                stack: error.stack,
                context: context,
                timestamp: new Date().toISOString(),
                severity: 'error'
            };

            // Log to database
            await supabase
                .from('system_logs')
                .insert(logEntry);

            // Log to console
            console.error(`[${type}]`, error, context);

            // Increment error metric
            this.incrementMetric('errors');

            // Create alert for critical errors
            if (this.isCriticalError(type)) {
                this.createAlert(type, error.message || error);
            }

        } catch (logError) {
            console.error('Failed to log error:', logError);
        }
    }

    async logSecurityEvent(type, context = {}) {
        try {
            const logEntry = {
                type: type,
                message: `Security event: ${type}`,
                context: context,
                timestamp: new Date().toISOString(),
                severity: 'security',
                ip_address: context.ip,
                user_agent: context.userAgent
            };

            await supabase
                .from('security_logs')
                .insert(logEntry);

            console.warn(`[SECURITY] ${type}:`, context);

            // Always create alerts for security events
            this.createAlert(`security_${type}`, `Security event detected: ${type}`);

        } catch (error) {
            console.error('Failed to log security event:', error);
        }
    }

    async logTransaction(transactionData) {
        try {
            const logEntry = {
                transaction_id: transactionData.id,
                worker_id: transactionData.workerId,
                amount: transactionData.amount,
                gateway: transactionData.gateway,
                status: transactionData.status,
                timestamp: new Date().toISOString()
            };

            await supabase
                .from('transaction_logs')
                .insert(logEntry);

            this.incrementMetric('payments');

        } catch (error) {
            console.error('Failed to log transaction:', error);
        }
    }

    // Alerting
    createAlert(type, message, severity = 'warning') {
        const alert = {
            id: Date.now().toString(),
            type: type,
            message: message,
            severity: severity,
            timestamp: new Date().toISOString(),
            acknowledged: false
        };

        this.alerts.push(alert);

        // Keep only last 100 alerts in memory
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }

        // In production, this would send to external alerting service
        console.warn(`[ALERT] ${severity.toUpperCase()}: ${message}`);

        // Store in database
        this.storeAlert(alert);
    }

    async storeAlert(alert) {
        try {
            await supabase
                .from('system_alerts')
                .insert(alert);
        } catch (error) {
            console.error('Failed to store alert:', error);
        }
    }

    isCriticalError(type) {
        const criticalTypes = [
            'database_error',
            'payment_gateway_error',
            'security_breach',
            'fraud_detected',
            'payout_failed'
        ];

        return criticalTypes.includes(type);
    }

    // Prometheus-style metrics endpoint
    getMetrics() {
        const uptime = Math.floor((Date.now() - this.metrics.uptime) / 1000);
        
        return `
# HELP ttip_requests_total Total number of requests
# TYPE ttip_requests_total counter
ttip_requests_total ${this.metrics.requests}

# HELP ttip_errors_total Total number of errors
# TYPE ttip_errors_total counter
ttip_errors_total ${this.metrics.errors}

# HELP ttip_payments_total Total number of payments
# TYPE ttip_payments_total counter
ttip_payments_total ${this.metrics.payments}

# HELP ttip_payouts_total Total number of payouts
# TYPE ttip_payouts_total counter
ttip_payouts_total ${this.metrics.payouts}

# HELP ttip_fraud_flags_total Total number of fraud flags
# TYPE ttip_fraud_flags_total counter
ttip_fraud_flags_total ${this.metrics.fraudFlags}

# HELP ttip_uptime_seconds Server uptime in seconds
# TYPE ttip_uptime_seconds gauge
ttip_uptime_seconds ${uptime}

# HELP ttip_error_rate Error rate percentage
# TYPE ttip_error_rate gauge
ttip_error_rate ${this.calculateErrorRate()}
        `.trim();
    }

    // Cleanup
    async cleanupOldLogs() {
        try {
            const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

            // Clean up old system logs
            await supabase
                .from('system_logs')
                .delete()
                .lt('timestamp', cutoffDate.toISOString());

            // Clean up old security logs (keep longer)
            const securityCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
            await supabase
                .from('security_logs')
                .delete()
                .lt('timestamp', securityCutoff.toISOString());

            console.log('Old logs cleaned up');

        } catch (error) {
            console.error('Failed to cleanup old logs:', error);
        }
    }

    // Performance monitoring
    createPerformanceMiddleware() {
        return (req, res, next) => {
            const start = Date.now();
            
            res.on('finish', () => {
                const responseTime = Date.now() - start;
                
                this.incrementMetric('requests');
                this.recordResponseTime(req.path, responseTime);
                
                if (res.statusCode >= 400) {
                    this.incrementMetric('errors');
                }
                
                // Log slow requests
                if (responseTime > 5000) {
                    this.logError('slow_request', new Error(`Slow request: ${req.path}`), {
                        path: req.path,
                        method: req.method,
                        responseTime: responseTime,
                        statusCode: res.statusCode
                    });
                }
            });
            
            next();
        };
    }
}