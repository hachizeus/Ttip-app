# Firebase Push Notifications Setup for TTip

## 1. Install Dependencies
```bash
npm install firebase @react-native-firebase/app @react-native-firebase/messaging expo-constants
```

## 2. Place Configuration Files
- **Android**: Place `google-services.json` in the root directory
- **iOS**: Place `GoogleService-Info.plist` in the root directory

## 3. Database Updates
Run the SQL commands in `database-update.sql` in your Supabase dashboard to add FCM token support.

## 4. Build Configuration
The `app.json` is already configured with:
- Firebase plugins
- Notification settings
- Package identifiers

## 5. Testing Push Notifications

### Test Tip Notification:
```javascript
import { sendTipNotification } from './lib/firebaseNotifications';
await sendTipNotification('254759001048', 100);
```

### Test Milestone Notification:
```javascript
import { sendMilestoneNotification } from './lib/firebaseNotifications';
await sendMilestoneNotification('254759001048', 1000);
```

### Test Subscription Reminder:
```javascript
import { sendSubscriptionReminder } from './lib/firebaseNotifications';
await sendSubscriptionReminder('254759001048');
```

## 6. Badge Management
- Badge count automatically increments with each notification
- Badge resets when user opens notifications modal
- Cross-platform badge support via Expo Notifications

## 7. Notification Types Implemented
1. **Tip Received**: "New Tip Received! 💰 You received KSh X tip"
2. **Milestones**: 
   - KSh 500: "🎉 Congratulations! You've reached KSh 500 in tips. Keep going!"
   - KSh 1,000: "🔥 Amazing! You've crossed KSh 1,000 in tips."
   - KSh 10,000: "🏆 Incredible! You're among the top earners with KSh 10,000 in tips!"
3. **Subscription**: "Your free trial has ended. Subscribe now to continue receiving tips."

## 8. Build Commands
```bash
# Development build
expo run:android
expo run:ios

# Production build
eas build --platform android
eas build --platform ios
```