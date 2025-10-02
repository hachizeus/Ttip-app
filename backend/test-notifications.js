// Test notification system
import { notifyTipReceived, getWorkerNotifications } from './notifications-service.js';

async function testNotifications() {
    console.log('=== Testing Notification System ===');
    
    // Test sending a tip notification
    const testWorkerId = 'W1ABCD'; // Replace with actual worker ID
    const testAmount = 100;
    const testCustomerPhone = '254712345678';
    
    console.log('Sending test notification...');
    await notifyTipReceived(testWorkerId, testAmount, testCustomerPhone);
    
    // Wait a moment then check notifications
    setTimeout(async () => {
        console.log('Checking notifications...');
        const notifications = await getWorkerNotifications('254700000000', 5); // Replace with actual worker phone
        console.log('Recent notifications:', notifications);
    }, 2000);
}

testNotifications().catch(console.error);