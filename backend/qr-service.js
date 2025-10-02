import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export const generateQRCode = async (workerId) => {
    try {
        // Create dual-purpose QR payload
        const fallbackUrl = `${process.env.BACKEND_URL || 'https://ttip-app.onrender.com'}/pay/${workerId}?t=${Date.now()}`;
        const mpesaDeepLink = `mpesa://paybill?businessNumber=247247&accountNumber=${workerId}`;
        
        // Combined payload with both deep link and fallback
        const qrPayload = `${mpesaDeepLink}|${fallbackUrl}`;
        
        // Generate PNG and SVG
        const qrPng = await QRCode.toDataURL(qrPayload, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        const qrSvg = await QRCode.toString(qrPayload, {
            type: 'svg',
            width: 300,
            margin: 2
        });
        
        // Upload PNG to Supabase Storage
        const pngBuffer = Buffer.from(qrPng.split(',')[1], 'base64');
        const fileName = `${workerId}.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('qr_codes')
            .upload(fileName, pngBuffer, {
                contentType: 'image/png',
                upsert: true
            });
        
        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('qr_codes')
            .getPublicUrl(fileName);
        
        // Save to database
        const { error: dbError } = await supabase
            .from('qr_codes')
            .upsert({
                worker_id: workerId,
                qr_url: publicUrl,
                qr_svg: qrSvg,
                created_at: new Date().toISOString()
            });
        
        if (dbError) {
            console.error('Database error:', dbError);
            throw dbError;
        }
        
        return {
            qrPngUrl: publicUrl,
            qrSvgUrl: publicUrl, // Same URL for now
            fallbackUrl,
            mpesaDeepLink
        };
        
    } catch (error) {
        console.error('QR generation error:', error);
        throw error;
    }
};

export const getWorkerQR = async (workerId) => {
    const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('worker_id', workerId)
        .single();
    
    if (error || !data) {
        // Generate new QR if not found
        return await generateQRCode(workerId);
    }
    
    return {
        qrPngUrl: data.qr_url,
        qrSvgUrl: data.qr_url,
        fallbackUrl: `${process.env.BACKEND_URL || 'https://ttip-app.onrender.com'}/pay/${workerId}`,
        mpesaDeepLink: `mpesa://paybill?businessNumber=247247&accountNumber=${workerId}`
    };
};