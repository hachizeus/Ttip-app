import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function generateAdmin() {
    console.log('🔐 Generating Admin User with 2FA...\n');

    try {
        // Get admin details from user input
        const username = process.argv[2] || 'admin';
        const password = process.argv[3] || generateRandomPassword();

        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
        console.log('⚠️  SAVE THESE CREDENTIALS SECURELY!\n');

        // Generate salt and hash password
        const salt = crypto.randomBytes(32).toString('hex');
        const passwordHash = crypto
            .createHash('sha256')
            .update(password + salt)
            .digest('hex');

        // Generate TOTP secret
        const totpSecret = speakeasy.generateSecret({
            name: `TTip Admin (${username})`,
            issuer: 'TTip'
        });

        // Create admin user
        const { data: admin, error } = await supabase
            .from('admin_users')
            .upsert({
                username: username,
                password_hash: passwordHash,
                salt: salt,
                totp_secret: totpSecret.base32,
                role: 'admin',
                active: true
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        console.log('✅ Admin user created successfully!');
        console.log(`Admin ID: ${admin.id}\n`);

        // Generate QR code for 2FA setup
        const qrCodeUrl = await QRCode.toDataURL(totpSecret.otpauth_url);
        
        console.log('📱 2FA Setup:');
        console.log('1. Install Google Authenticator or similar TOTP app');
        console.log('2. Scan this QR code or enter the secret manually:');
        console.log(`\nTOTP Secret: ${totpSecret.base32}`);
        console.log(`\nQR Code Data URL: ${qrCodeUrl.substring(0, 100)}...`);
        
        // Save QR code to file
        const fs = await import('fs');
        const qrBuffer = Buffer.from(qrCodeUrl.split(',')[1], 'base64');
        fs.writeFileSync(`admin-2fa-qr-${username}.png`, qrBuffer);
        
        console.log(`\n💾 QR code saved as: admin-2fa-qr-${username}.png`);

        // Test TOTP generation
        const testToken = speakeasy.totp({
            secret: totpSecret.base32,
            encoding: 'base32'
        });

        console.log(`\n🧪 Test TOTP token (current): ${testToken}`);
        console.log('Use this token to test your 2FA setup');

        console.log('\n🎉 Admin setup complete!');
        console.log('\nLogin credentials:');
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
        console.log(`2FA Secret: ${totpSecret.base32}`);
        console.log('\n⚠️  Store these credentials in a secure password manager!');

    } catch (error) {
        console.error('❌ Admin generation failed:', error);
        process.exit(1);
    }
}

function generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Usage: node generate-admin.js [username] [password]
generateAdmin();