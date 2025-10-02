import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';
import { sendTipNotification } from './sms.mjs';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const milestones = [
    { threshold: 500, badge: '🥉 Bronze Earner', message: 'You\'ve earned your first KSh 500! Keep it up!' },
    { threshold: 1000, badge: '🥈 Silver Star', message: 'KSh 1,000 earned! You\'re on fire!' },
    { threshold: 5000, badge: '🥇 Gold Champion', message: 'KSh 5,000 milestone! You\'re amazing!' },
    { threshold: 10000, badge: '💎 Diamond Elite', message: 'KSh 10,000! You\'re a TTip legend!' },
    { threshold: 25000, badge: '👑 Platinum King', message: 'KSh 25,000! Absolutely incredible!' }
];

export const sendNotification = async (userId, title, message, data = null, sendSMS = false) => {
    try {
        // Save to database
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                body: message,
                meta: data ? JSON.stringify(data) : null,
                status: 'UNREAD',
                created_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('Error saving notification:', error);
        }
        
        // Send SMS if requested and no FCM token
        if (sendSMS) {
            try {
                await sendTipNotification(userId, 0); // Reuse SMS function
            } catch (smsError) {
                console.log('SMS notification failed:', smsError.message);
            }
        }
        
        // TODO: Send FCM push notification when implemented
        console.log(`Notification sent to ${userId}: ${title}`);
        
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

export const checkMilestones = async (workerId, newTotal, previousTotal) => {
    try {
        // Find milestones crossed
        const crossedMilestones = milestones.filter(
            milestone => previousTotal < milestone.threshold && newTotal >= milestone.threshold
        );
        
        if (crossedMilestones.length === 0) return;
        
        // Get worker details
        const { data: worker } = await supabase
            .from('workers')
            .select('phone, name')
            .eq('worker_id', workerId)
            .single();
        
        if (!worker) return;
        
        // Send milestone notifications
        for (const milestone of crossedMilestones) {
            await sendNotification(
                worker.phone,
                `🎉 ${milestone.badge}`,
                milestone.message,
                {
                    type: 'milestone',
                    threshold: milestone.threshold,
                    badge: milestone.badge
                },
                true // Send SMS
            );
            
            console.log(`Milestone notification sent to ${worker.name}: ${milestone.badge}`);
        }
        
    } catch (error) {
        console.error('Error checking milestones:', error);
    }
};

export const notifyTipReceived = async (workerId, amount, customerPhone) => {
    try {
        // Get worker details
        const { data: worker } = await supabase
            .from('workers')
            .select('phone, name, total_tips')
            .eq('worker_id', workerId)
            .single();
        
        if (!worker) return;
        
        const previousTotal = worker.total_tips || 0;
        const newTotal = previousTotal + amount;
        
        // Send tip notification
        await sendNotification(
            worker.phone,
            '💰 Tip Received!',
            `You received KSh ${amount}! Keep up the excellent work!`,
            {
                type: 'tip_received',
                amount,
                customer_phone: customerPhone
            },
            true // Send SMS
        );
        
        // Check for milestones
        await checkMilestones(workerId, newTotal, previousTotal);
        
    } catch (error) {
        console.error('Error notifying tip received:', error);
    }
};

export const getWorkerNotifications = async (workerPhone, limit = 20) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', workerPhone)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
        
        return data || [];
        
    } catch (error) {
        console.error('Error getting worker notifications:', error);
        return [];
    }
};

export const markNotificationRead = async (notificationId) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ status: 'read' })
            .eq('id', notificationId);
        
        if (error) {
            console.error('Error marking notification as read:', error);
        }
        
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
};