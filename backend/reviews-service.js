import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';
import { sendTipNotification } from './sms.mjs';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const positiveReviews = [
    "Great service! 👍",
    "Excellent work! ⭐",
    "Keep up the good work! 💪",
    "Amazing service! 🌟",
    "Outstanding! 👏",
    "Professional service! 💯",
    "Highly recommended! ✨",
    "Fantastic job! 🎉"
];

export const processCompletedTransaction = async (transactionId, workerId, amount, customerPhone) => {
    try {
        // Send SMS to customer asking for review
        const reviewMessage = `Thanks for your KSh ${amount} tip! How was the service? Reply with a short note or we'll assume it was great! 😊`;
        
        try {
            await sendTipNotification(customerPhone, amount);
        } catch (smsError) {
            console.log('SMS failed, continuing with auto-review:', smsError.message);
        }
        
        // Auto-generate positive review after 5 minutes if no response
        setTimeout(async () => {
            await generateAutoReview(transactionId, workerId);
        }, 5 * 60 * 1000); // 5 minutes
        
        return true;
    } catch (error) {
        console.error('Error processing completed transaction:', error);
        return false;
    }
};

export const generateAutoReview = async (transactionId, workerId) => {
    try {
        // Check if review already exists
        const { data: existingReview } = await supabase
            .from('reviews')
            .select('id')
            .eq('tx_id', transactionId)
            .single();
        
        if (existingReview) {
            console.log('Review already exists for transaction:', transactionId);
            return;
        }
        
        // Generate random positive review
        const randomReview = positiveReviews[Math.floor(Math.random() * positiveReviews.length)];
        
        // Insert auto-generated review
        const { error } = await supabase
            .from('reviews')
            .insert({
                tx_id: transactionId,
                worker_id: workerId,
                rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
                comment: randomReview,
                created_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('Error creating auto-review:', error);
            return;
        }
        
        // Update worker rating average
        await updateWorkerRating(workerId);
        
        console.log(`Auto-review generated for worker ${workerId}: ${randomReview}`);
        
    } catch (error) {
        console.error('Error generating auto-review:', error);
    }
};

export const submitCustomerReview = async (transactionId, workerId, rating, comment) => {
    try {
        // Insert customer review (will replace auto-review if exists)
        const { error } = await supabase
            .from('reviews')
            .upsert({
                tx_id: transactionId,
                worker_id: workerId,
                rating: rating,
                comment: comment,
                created_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('Error submitting customer review:', error);
            return false;
        }
        
        // Update worker rating average
        await updateWorkerRating(workerId);
        
        console.log(`Customer review submitted for worker ${workerId}: ${rating} stars`);
        return true;
        
    } catch (error) {
        console.error('Error submitting customer review:', error);
        return false;
    }
};

const updateWorkerRating = async (workerId) => {
    try {
        // Calculate average rating for worker
        const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('worker_id', workerId);
        
        if (!reviews || reviews.length === 0) return;
        
        const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        
        // Update worker with new average rating
        const { error } = await supabase
            .from('workers')
            .update({
                // Add rating fields if they don't exist
                average_rating: Math.round(averageRating * 10) / 10,
                review_count: reviews.length,
                updated_at: new Date().toISOString()
            })
            .eq('worker_id', workerId);
        
        if (error) {
            console.error('Error updating worker rating:', error);
        }
        
    } catch (error) {
        console.error('Error calculating worker rating:', error);
    }
};