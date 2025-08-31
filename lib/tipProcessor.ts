import { supabase } from './supabase';
import { notifyTipReceived, checkMilestones } from './notifications';
import { sendTipNotification, sendMilestoneNotification } from './firebaseNotifications';

export async function processTipReceived(workerId: string, amount: number, customerPhone: string) {
  try {
    // Get current worker data
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('total_tips, tip_count, phone')
      .eq('worker_id', workerId)
      .single();

    if (workerError || !worker) {
      console.error('Error fetching worker:', workerError);
      return;
    }

    const previousTotal = worker.total_tips || 0;
    const newTotal = previousTotal + amount;
    const newTipCount = (worker.tip_count || 0) + 1;

    // Update worker totals
    const { error: updateError } = await supabase
      .from('workers')
      .update({
        total_tips: newTotal,
        tip_count: newTipCount,
      })
      .eq('worker_id', workerId);

    if (updateError) {
      console.error('Error updating worker totals:', updateError);
      return;
    }

    // Send local notification
    await notifyTipReceived(amount, customerPhone);
    
    // Send Firebase push notification
    await sendTipNotification(worker.phone, amount);

    // Check for milestone notifications
    await checkMilestones(newTotal, previousTotal);
    
    // Check for Firebase milestone notifications
    const milestones = [500, 1000, 10000];
    for (const milestone of milestones) {
      if (newTotal >= milestone && previousTotal < milestone) {
        await sendMilestoneNotification(worker.phone, milestone);
      }
    }

  } catch (error) {
    console.error('Error processing tip:', error);
  }
}

// Function to be called when M-Pesa callback confirms payment
export async function handleMpesaCallback(transactionId: string, status: 'completed' | 'failed') {
  try {
    // Update tip status
    const { data: tip, error: tipError } = await supabase
      .from('tips')
      .update({ status })
      .eq('transaction_id', transactionId)
      .select('worker_id, amount, customer_phone')
      .single();

    if (tipError || !tip) {
      console.error('Error updating tip status:', tipError);
      return;
    }

    // If payment completed, process the tip
    if (status === 'completed') {
      await processTipReceived(tip.worker_id, tip.amount, tip.customer_phone);
    }

  } catch (error) {
    console.error('Error handling M-Pesa callback:', error);
  }
}