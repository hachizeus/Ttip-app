import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugSubscription() {
  try {
    // Get all workers to see subscription data
    const { data: workers, error } = await supabase
      .from('workers')
      .select('phone, name, subscription_plan, subscription_expiry, created_at')
      .limit(5);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Workers subscription data:');
    workers.forEach(worker => {
      const now = new Date();
      const createdAt = new Date(worker.created_at);
      const trialEndDate = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      const subscriptionExpiry = worker.subscription_expiry ? new Date(worker.subscription_expiry) : null;
      
      const isTrialActive = now <= trialEndDate;
      const hasActiveSubscription = subscriptionExpiry && now < subscriptionExpiry;
      
      console.log(`\nPhone: ${worker.phone}`);
      console.log(`Name: ${worker.name}`);
      console.log(`DB subscription_plan: "${worker.subscription_plan}"`);
      console.log(`DB subscription_expiry: ${worker.subscription_expiry}`);
      console.log(`Created: ${worker.created_at}`);
      console.log(`Trial end date: ${trialEndDate.toISOString()}`);
      console.log(`Is trial active: ${isTrialActive}`);
      console.log(`Has active subscription: ${hasActiveSubscription}`);
      
      let displayPlan;
      if (!isTrialActive && !hasActiveSubscription) {
        displayPlan = 'Limited Mode';
      } else if (!isTrialActive && hasActiveSubscription) {
        displayPlan = worker.subscription_plan === 'lite' ? 'Lite Plan' : 
                     worker.subscription_plan === 'pro' ? 'Pro Plan' : 
                     worker.subscription_plan;
      } else if (isTrialActive) {
        displayPlan = 'Free Trial';
      }
      
      console.log(`Should display: ${displayPlan}`);
    });
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugSubscription();