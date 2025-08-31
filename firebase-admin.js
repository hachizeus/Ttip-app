const admin = require('firebase-admin');
const serviceAccount = require('../app/ttip-89517-firebase-adminsdk-fbsvc-f59b633956.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function sendPushNotification(fcmToken, title, body, data = {}) {
  const message = {
    notification: {
      title,
      body,
    },
    data,
    token: fcmToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

module.exports = { sendPushNotification };