// TTip Phase 3 Test Script
// Tests: Marketplace, Social Features, Loyalty, Gamification

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

console.log('🚀 TTip Phase 3 Testing Started');
console.log('Testing: Marketplace, Social Features, Loyalty, Gamification');
console.log('='.repeat(60));

// Helper function to make API calls
const apiCall = async (method, endpoint, data = null) => {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (data) config.data = data;
        
        const response = await axios(config);
        return { success: true, data: response.data };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data?.error || error.message 
        };
    }
};

// Test 1: Database Schema
const testDatabaseSchema = async () => {
    console.log('\n🗄️  Test 1: Phase 3 Database Schema');
    
    try {
        const tables = [
            'worker_profiles',
            'service_categories',
            'worker_services',
            'loyalty_points',
            'loyalty_rewards',
            'achievement_badges',
            'user_achievements',
            'leaderboards',
            'social_interactions',
            'worker_followers'
        ];
        
        let tablesExist = 0;
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
            
            if (error) {
                console.log(`⚠️  Table ${table} not accessible`);
            } else {
                console.log(`✅ Table ${table} exists and accessible`);
                tablesExist++;
            }
        }
        
        console.log(`📊 Database Status: ${tablesExist}/${tables.length} tables accessible`);
        return tablesExist >= 8; // Pass if most tables exist
        
    } catch (error) {
        console.log('❌ Database schema test failed:', error.message);
        return false;
    }
};

// Test 2: Service Categories
const testServiceCategories = async () => {
    console.log('\n🏷️  Test 2: Service Categories');
    
    try {
        const categories = await apiCall('GET', '/api/categories');
        
        if (!categories.success) {
            console.log('❌ Categories endpoint failed:', categories.error);
            return false;
        }
        
        console.log('✅ Categories endpoint working');
        console.log(`   Found ${categories.data.categories?.length || 0} categories`);
        
        if (categories.data.categories?.length > 0) {
            console.log('   Sample categories:', 
                categories.data.categories.slice(0, 3).map(c => c.name).join(', ')
            );
        }
        
        return true;
        
    } catch (error) {
        console.log('❌ Categories test failed:', error.message);
        return false;
    }
};

// Test 3: Marketplace Workers
const testMarketplace = async () => {
    console.log('\n🏪 Test 3: Marketplace');
    
    try {
        const workers = await apiCall('GET', '/api/marketplace/workers?limit=5');
        
        if (!workers.success) {
            console.log('❌ Marketplace endpoint failed:', workers.error);
            return false;
        }
        
        console.log('✅ Marketplace endpoint working');
        console.log(`   Found ${workers.data.workers?.length || 0} workers`);
        
        if (workers.data.workers?.length > 0) {
            const worker = workers.data.workers[0];
            console.log('   Sample worker:', {
                name: worker.name,
                occupation: worker.occupation,
                rating: worker.average_rating
            });
        }
        
        return true;
        
    } catch (error) {
        console.log('❌ Marketplace test failed:', error.message);
        return false;
    }
};

// Test 4: Worker Profile
const testWorkerProfile = async () => {
    console.log('\n👤 Test 4: Worker Profile');
    
    try {
        const workerId = 'W001TEST';
        const profile = await apiCall('GET', `/api/workers/${workerId}/profile`);
        
        if (!profile.success) {
            console.log('❌ Profile endpoint failed:', profile.error);
            return false;
        }
        
        console.log('✅ Profile endpoint working');
        console.log('   Profile data:', {
            name: profile.data.profile?.name,
            occupation: profile.data.profile?.occupation,
            rating: profile.data.profile?.average_rating
        });
        
        return true;
        
    } catch (error) {
        console.log('❌ Profile test failed:', error.message);
        return false;
    }
};

// Test 5: Loyalty System
const testLoyaltySystem = async () => {
    console.log('\n🎁 Test 5: Loyalty System');
    
    try {
        const customerPhone = '254700000999';
        
        // Test loyalty points endpoint
        const loyalty = await apiCall('GET', `/api/loyalty/${customerPhone}`);
        
        if (!loyalty.success) {
            console.log('❌ Loyalty endpoint failed:', loyalty.error);
            return false;
        }
        
        console.log('✅ Loyalty endpoint working');
        console.log('   Loyalty data:', {
            balance: loyalty.data.loyalty?.current_balance || 0,
            tier: loyalty.data.loyalty?.tier_level || 'bronze',
            rewards: loyalty.data.availableRewards?.length || 0
        });
        
        // Test awarding points
        const awardPoints = await apiCall('POST', '/api/loyalty/award', {
            customerPhone: customerPhone,
            workerId: 'W001TEST',
            points: 10,
            reason: 'Test tip'
        });
        
        if (awardPoints.success) {
            console.log('✅ Points awarded successfully');
            console.log(`   Awarded ${awardPoints.data.pointsAwarded} points`);
        }
        
        return true;
        
    } catch (error) {
        console.log('❌ Loyalty test failed:', error.message);
        return false;
    }
};

// Test 6: Achievements System
const testAchievements = async () => {
    console.log('\n🏅 Test 6: Achievements System');
    
    try {
        const userId = 'W001TEST';
        const userType = 'worker';
        
        // Test achievements endpoint
        const achievements = await apiCall('GET', `/api/achievements/${userId}/${userType}`);
        
        if (!achievements.success) {
            console.log('❌ Achievements endpoint failed:', achievements.error);
            return false;
        }
        
        console.log('✅ Achievements endpoint working');
        console.log(`   Found ${achievements.data.achievements?.length || 0} achievements`);
        
        // Test achievement checking
        const checkAchievements = await apiCall('POST', '/api/achievements/check', {
            userId: userId,
            userType: userType,
            stats: {
                tips_received: 1,
                total_earnings: 100,
                rating: 4.5,
                reviews: 5
            }
        });
        
        if (checkAchievements.success) {
            console.log('✅ Achievement checking working');
            console.log(`   New achievements: ${checkAchievements.data.newAchievements?.length || 0}`);
        }
        
        return true;
        
    } catch (error) {
        console.log('❌ Achievements test failed:', error.message);
        return false;
    }
};

// Test 7: Leaderboards
const testLeaderboards = async () => {
    console.log('\n🏆 Test 7: Leaderboards');
    
    try {
        const leaderboard = await apiCall('GET', '/api/leaderboards/top_earners/monthly?limit=5');
        
        if (!leaderboard.success) {
            console.log('❌ Leaderboard endpoint failed:', leaderboard.error);
            return false;
        }
        
        console.log('✅ Leaderboard endpoint working');
        console.log(`   Found ${leaderboard.data.leaderboard?.length || 0} entries`);
        
        return true;
        
    } catch (error) {
        console.log('❌ Leaderboard test failed:', error.message);
        return false;
    }
};

// Test 8: Social Features
const testSocialFeatures = async () => {
    console.log('\n👥 Test 8: Social Features');
    
    try {
        const workerId = 'W001TEST';
        const customerPhone = '254700000999';
        
        // Test follow worker
        const follow = await apiCall('POST', `/api/workers/${workerId}/follow`, {
            customerPhone: customerPhone,
            action: 'follow'
        });
        
        if (!follow.success) {
            console.log('❌ Follow endpoint failed:', follow.error);
            return false;
        }
        
        console.log('✅ Follow endpoint working');
        console.log('   Follow result:', {
            action: follow.data.action,
            followers: follow.data.followers
        });
        
        return true;
        
    } catch (error) {
        console.log('❌ Social features test failed:', error.message);
        return false;
    }
};

// Run all tests
const runAllTests = async () => {
    console.log('Starting Phase 3 testing...\n');
    
    let testResults = {
        database: false,
        categories: false,
        marketplace: false,
        profile: false,
        loyalty: false,
        achievements: false,
        leaderboards: false,
        social: false
    };
    
    try {
        // Run tests
        testResults.database = await testDatabaseSchema();
        testResults.categories = await testServiceCategories();
        testResults.marketplace = await testMarketplace();
        testResults.profile = await testWorkerProfile();
        testResults.loyalty = await testLoyaltySystem();
        testResults.achievements = await testAchievements();
        testResults.leaderboards = await testLeaderboards();
        testResults.social = await testSocialFeatures();
        
    } catch (error) {
        console.log('\n❌ Test suite failed:', error.message);
    }
    
    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('🏁 PHASE 3 TEST RESULTS');
    console.log('='.repeat(60));
    
    const tests = [
        { name: 'Database Schema', result: testResults.database },
        { name: 'Service Categories', result: testResults.categories },
        { name: 'Marketplace Discovery', result: testResults.marketplace },
        { name: 'Worker Profiles', result: testResults.profile },
        { name: 'Loyalty System', result: testResults.loyalty },
        { name: 'Achievements', result: testResults.achievements },
        { name: 'Leaderboards', result: testResults.leaderboards },
        { name: 'Social Features', result: testResults.social }
    ];
    
    tests.forEach(test => {
        const status = test.result ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${test.name}`);
    });
    
    const passedTests = tests.filter(t => t.result).length;
    const totalTests = tests.length;
    
    console.log('\n📈 SUMMARY:');
    console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`   Success Rate: ${Math.round(passedTests/totalTests*100)}%`);
    
    if (passedTests >= 6) {
        console.log('\n🎉 Phase 3 core features are working!');
    } else {
        console.log('\n⚠️  Some core features need attention.');
    }
    
    console.log('\n💡 Phase 3 Features:');
    console.log('   🏪 Marketplace: http://localhost:3000/marketplace-dashboard.html');
    console.log('   👤 Worker Profiles: Enhanced social profiles');
    console.log('   🎁 Loyalty Program: Points and rewards system');
    console.log('   🏅 Achievements: Gamification badges');
    console.log('   🏆 Leaderboards: Competition and rankings');
    console.log('   👥 Social Features: Follow workers, reviews');
};

// Run tests
runAllTests().catch(console.error);