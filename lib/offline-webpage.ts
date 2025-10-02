import AsyncStorage from '@react-native-async-storage/async-storage';

export class OfflineWebpage {
  // Store webpage HTML for offline access
  static async storeWebpage(workerID: string, htmlContent: string) {
    try {
      await AsyncStorage.setItem(`webpage_${workerID}`, htmlContent);
      await AsyncStorage.setItem(`webpage_${workerID}_timestamp`, Date.now().toString());
    } catch (error) {
      console.error('Failed to store webpage:', error);
    }
  }

  // Get stored webpage HTML
  static async getWebpage(workerID: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`webpage_${workerID}`);
    } catch (error) {
      console.error('Failed to get webpage:', error);
      return null;
    }
  }

  // Generate offline tip webpage HTML
  static generateOfflineTipPage(workerID: string, workerName: string = 'Worker') {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tip ${workerName} - TTip</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .container { max-width: 400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { width: 80px; height: 80px; background: #007AFF; border-radius: 20px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold; }
        .title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 5px; }
        .subtitle { color: #666; }
        .tip-form { background: white; border-radius: 16px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #333; }
        input { width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; }
        input:focus { outline: none; border-color: #007AFF; }
        .tip-buttons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
        .tip-btn { padding: 12px; border: 2px solid #e0e0e0; background: white; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .tip-btn:hover, .tip-btn.active { background: #007AFF; color: white; border-color: #007AFF; }
        .pay-btn { width: 100%; padding: 15px; background: #007AFF; color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; }
        .pay-btn:disabled { background: #ccc; cursor: not-allowed; }
        .offline-notice { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">T</div>
            <h1 class="title">Tip ${workerName}</h1>
            <p class="subtitle">Send a digital tip via M-Pesa</p>
        </div>
        
        <div class="offline-notice">
            <strong>Offline Mode:</strong> Your tip will be processed when internet connection is restored.
        </div>
        
        <div class="tip-form">
            <div class="form-group">
                <label>Select Amount (KSh)</label>
                <div class="tip-buttons">
                    <button class="tip-btn" onclick="setAmount(50)">50</button>
                    <button class="tip-btn" onclick="setAmount(100)">100</button>
                    <button class="tip-btn" onclick="setAmount(200)">200</button>
                    <button class="tip-btn" onclick="setAmount(500)">500</button>
                    <button class="tip-btn" onclick="setAmount(1000)">1000</button>
                    <button class="tip-btn" onclick="document.getElementById('customAmount').focus()">Other</button>
                </div>
                <input type="number" id="customAmount" placeholder="Enter custom amount" oninput="setCustomAmount(this.value)">
            </div>
            
            <div class="form-group">
                <label>Your Phone Number</label>
                <input type="tel" id="phoneNumber" placeholder="0712345678" required>
            </div>
            
            <button class="pay-btn" onclick="processTip()">Send Tip (Offline)</button>
        </div>
    </div>
    
    <script>
        let selectedAmount = 0;
        
        function setAmount(amount) {
            selectedAmount = amount;
            document.getElementById('customAmount').value = amount;
            document.querySelectorAll('.tip-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
        }
        
        function setCustomAmount(amount) {
            selectedAmount = parseInt(amount) || 0;
            document.querySelectorAll('.tip-btn').forEach(btn => btn.classList.remove('active'));
        }
        
        function processTip() {
            const phone = document.getElementById('phoneNumber').value;
            const amount = selectedAmount || parseInt(document.getElementById('customAmount').value);
            
            if (!phone || !amount) {
                alert('Please enter phone number and amount');
                return;
            }
            
            // Store offline tip
            const tip = {
                workerID: '${workerID}',
                amount: amount,
                phone: phone,
                timestamp: Date.now(),
                status: 'offline_pending'
            };
            
            localStorage.setItem('offline_tip_' + Date.now(), JSON.stringify(tip));
            alert('Tip queued for processing when online! Amount: KSh ' + amount);
            
            // Reset form
            document.getElementById('phoneNumber').value = '';
            document.getElementById('customAmount').value = '';
            selectedAmount = 0;
            document.querySelectorAll('.tip-btn').forEach(btn => btn.classList.remove('active'));
        }
    </script>
</body>
</html>`;
  }

  // Check if webpage is cached
  static async isWebpageCached(workerID: string): Promise<boolean> {
    try {
      const webpage = await AsyncStorage.getItem(`webpage_${workerID}`);
      return webpage !== null;
    } catch (error) {
      return false;
    }
  }
}