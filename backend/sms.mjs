import axios from 'axios'

const INFOBIP_API_KEY = '31452a76fa854f2a28ea57e832ff03ea-904c3ac4-b9f0-4553-9a62-6c1e8cecf2a0'
const INFOBIP_BASE_URL = 'https://5139rg.api.infobip.com'

const tipMessages = [
    "🎉 You've received KSh {amount} via Ttip. Great service today 👏",
    "🎉 You've received KSh {amount} via Ttip. Keep up the good work 💯", 
    "🎉 You've received KSh {amount} via Ttip. Customers appreciate your effort 🙌",
    "🎉 You've received KSh {amount} via Ttip. Excellent work! 🌟",
    "🎉 You've received KSh {amount} via Ttip. You're doing amazing! ✨"
]

export const sendTipNotification = async (phone, amount) => {
    try {
        const randomMessage = tipMessages[Math.floor(Math.random() * tipMessages.length)]
        const message = randomMessage.replace('{amount}', amount)
        
        const result = await axios.post(`${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
            messages: [{
                from: 'TTip',
                destinations: [{
                    to: phone.startsWith('+') ? phone : `+${phone}`
                }],
                text: message
            }]
        }, {
            headers: {
                'Authorization': `App ${INFOBIP_API_KEY}`,
                'Content-Type': 'application/json'
            }
        })
        
        console.log('SMS sent:', result.data)
        return result.data
    } catch (error) {
        console.error('SMS error:', error.response?.data || error)
        throw error
    }
}

export const sendOTPSMS = async (phone, otp) => {
    try {
        const message = `Your Ttip login code is ${otp}. Expires in 5 minutes.`
        
        const result = await axios.post(`${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
            messages: [{
                from: 'TTip',
                destinations: [{
                    to: phone.startsWith('+') ? phone : `+${phone}`
                }],
                text: message
            }]
        }, {
            headers: {
                'Authorization': `App ${INFOBIP_API_KEY}`,
                'Content-Type': 'application/json'
            }
        })
        
        console.log('OTP SMS sent:', result.data)
        return result.data
    } catch (error) {
        console.error('OTP SMS error:', error.response?.data || error)
        throw error
    }
}