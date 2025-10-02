import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || '25f98f9e6e80da5e4a360d3ef1ad1d8dcc5d8477391db87ffa6dab673be7b64c';

export async function authenticateAdmin(username, password, totpCode) {
    try {
        // For demo purposes, use hardcoded admin
        if (username === 'admin' && password === 'admin123') {
            // In production, verify TOTP code here
            const token = jwt.sign(
                { 
                    userId: 'admin-1', 
                    username: 'admin', 
                    role: 'admin' 
                },
                JWT_SECRET,
                { expiresIn: '8h' }
            );
            
            return {
                success: true,
                token: token,
                user: { id: 'admin-1', username: 'admin', role: 'admin' }
            };
        }
        
        return { success: false, error: 'Invalid credentials' };
    } catch (error) {
        return { success: false, error: 'Authentication failed' };
    }
}

export function verifyAdminToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { valid: true, user: decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

export const requireAdminAuth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const verification = verifyAdminToken(token);
        if (!verification.valid) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        req.adminUser = verification.user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
};