import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function setupPhase3Database() {
    console.log('🚀 Setting up Phase 3 Database Schema...\n');

    try {
        // Read and execute schema
        const schema = readFileSync('./phase3-schema.sql', 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = schema.split(';').filter(stmt => stmt.trim());
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                console.log(`Executing statement ${i + 1}/${statements.length}...`);
                
                const { error } = await supabase.rpc('exec_sql', { 
                    sql: statement 
                });
                
                if (error) {
                    console.error(`Error in statement ${i + 1}:`, error);
                    // Continue with other statements
                }
            }
        }

        console.log('\n✅ Phase 3 database schema setup completed!');
        
        // Verify tables were created
        console.log('\n🔍 Verifying tables...');
        
        const tables = [
            'idempotency_keys',
            'admin_users', 
            'fraud_checks',
            'fraud_blacklist',
            'ussd_qr_codes',
            'ussd_mappings',
            'system_logs',
            'security_logs',
            'system_alerts',
            'analytics_events',
            'ml_insights'
        ];

        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('count')
                .limit(1);
            
            if (error) {
                console.log(`❌ ${table}: ${error.message}`);
            } else {
                console.log(`✅ ${table}: Ready`);
            }
        }

        console.log('\n🎉 Phase 3 database setup complete!');
        console.log('\nNext steps:');
        console.log('1. Run: npm run generate-admin (to create admin user)');
        console.log('2. Update environment variables with payment gateway credentials');
        console.log('3. Start server: npm start');

    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }
}

setupPhase3Database();