import { initiateMpesaPayment, initiateB2CPayment } from '../enhanced-daraja.mjs';
// import Stripe from 'stripe'; // Commented out for testing
import axios from 'axios';

export class PaymentGatewayService {
    constructor() {
        // this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Commented for testing
        this.paypalClientId = process.env.PAYPAL_CLIENT_ID;
        this.paypalSecret = process.env.PAYPAL_SECRET;
        this.flutterwaveSecret = process.env.FLUTTERWAVE_SECRET_KEY;
    }

    async processPayment({ method, amount, currency, customer, metadata }) {
        switch (method.toLowerCase()) {
            case 'mpesa':
                return this.processMpesaPayment(amount, customer.phone, metadata);
            case 'stripe':
                return this.processStripePayment(amount, currency, customer, metadata);
            case 'paypal':
                return this.processPayPalPayment(amount, currency, customer, metadata);
            case 'flutterwave':
                return this.processFlutterwavePayment(amount, currency, customer, metadata);
            default:
                throw new Error(`Unsupported payment method: ${method}`);
        }
    }

    async processMpesaPayment(amount, phoneNumber, metadata) {
        try {
            const formattedPhone = phoneNumber.startsWith('0') 
                ? '254' + phoneNumber.substring(1) 
                : phoneNumber;

            const response = await initiateMpesaPayment(
                formattedPhone,
                amount,
                metadata.workerId
            );

            return {
                status: response.ResponseCode === '0' ? 'pending' : 'failed',
                reference: response.CheckoutRequestID,
                message: response.ResponseDescription,
                raw: response
            };
        } catch (error) {
            throw new Error(`M-Pesa payment failed: ${error.message}`);
        }
    }

    async processStripePayment(amount, currency, customer, metadata) {
        try {
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                            name: `Tip for ${metadata.workerName}`,
                            description: `TTip payment to worker ${metadata.workerId}`
                        },
                        unit_amount: Math.round(amount * 100) // Convert to cents
                    },
                    quantity: 1
                }],
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
                customer_email: customer.email,
                metadata: {
                    workerId: metadata.workerId,
                    workerName: metadata.workerName
                }
            });

            return {
                status: 'pending',
                reference: session.id,
                checkoutUrl: session.url,
                message: 'Stripe checkout session created',
                raw: session
            };
        } catch (error) {
            throw new Error(`Stripe payment failed: ${error.message}`);
        }
    }

    async processPayPalPayment(amount, currency, customer, metadata) {
        try {
            // Get PayPal access token
            const authResponse = await axios.post(
                `${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`,
                'grant_type=client_credentials',
                {
                    headers: {
                        'Accept': 'application/json',
                        'Accept-Language': 'en_US',
                        'Authorization': `Basic ${Buffer.from(`${this.paypalClientId}:${this.paypalSecret}`).toString('base64')}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const accessToken = authResponse.data.access_token;

            // Create PayPal order
            const orderResponse = await axios.post(
                `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders`,
                {
                    intent: 'CAPTURE',
                    purchase_units: [{
                        amount: {
                            currency_code: currency,
                            value: amount.toString()
                        },
                        description: `Tip for ${metadata.workerName}`,
                        custom_id: metadata.workerId
                    }],
                    application_context: {
                        return_url: `${process.env.FRONTEND_URL}/payment/success`,
                        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            const approvalUrl = orderResponse.data.links.find(link => link.rel === 'approve').href;

            return {
                status: 'pending',
                reference: orderResponse.data.id,
                checkoutUrl: approvalUrl,
                message: 'PayPal order created',
                raw: orderResponse.data
            };
        } catch (error) {
            throw new Error(`PayPal payment failed: ${error.message}`);
        }
    }

    async processFlutterwavePayment(amount, currency, customer, metadata) {
        try {
            const response = await axios.post(
                'https://api.flutterwave.com/v3/payments',
                {
                    tx_ref: `ttip_${Date.now()}_${metadata.workerId}`,
                    amount: amount,
                    currency: currency,
                    redirect_url: `${process.env.FRONTEND_URL}/payment/success`,
                    customer: {
                        email: customer.email,
                        phonenumber: customer.phone,
                        name: 'TTip Customer'
                    },
                    customizations: {
                        title: 'TTip Payment',
                        description: `Tip for ${metadata.workerName}`,
                        logo: `${process.env.FRONTEND_URL}/logo.png`
                    },
                    meta: {
                        workerId: metadata.workerId,
                        workerName: metadata.workerName
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.flutterwaveSecret}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                status: 'pending',
                reference: response.data.data.tx_ref,
                checkoutUrl: response.data.data.link,
                message: 'Flutterwave payment link created',
                raw: response.data
            };
        } catch (error) {
            throw new Error(`Flutterwave payment failed: ${error.message}`);
        }
    }

    async handleWebhook(gateway, payload) {
        switch (gateway) {
            case 'mpesa':
                return this.handleMpesaWebhook(payload);
            case 'stripe':
                return this.handleStripeWebhook(payload);
            case 'paypal':
                return this.handlePayPalWebhook(payload);
            case 'flutterwave':
                return this.handleFlutterwaveWebhook(payload);
            default:
                throw new Error(`Unsupported webhook gateway: ${gateway}`);
        }
    }

    async handleMpesaWebhook(payload) {
        const { Body } = payload;
        
        if (Body?.stkCallback) {
            const { ResultCode, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;
            
            if (ResultCode === 0) {
                const metadata = CallbackMetadata?.Item || [];
                const amount = metadata.find(item => item.Name === 'Amount')?.Value;
                const mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
                
                return {
                    success: true,
                    status: 'COMPLETED',
                    reference: CheckoutRequestID,
                    transactionId: mpesaReceiptNumber,
                    amount: amount,
                    originalPayload: payload
                };
            } else {
                return {
                    success: true,
                    status: 'FAILED',
                    reference: CheckoutRequestID,
                    originalPayload: payload
                };
            }
        }
        
        return { success: false };
    }

    async handleStripeWebhook(payload) {
        const event = payload;
        
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                return {
                    success: true,
                    status: 'COMPLETED',
                    reference: session.id,
                    transactionId: session.payment_intent,
                    amount: session.amount_total / 100,
                    workerId: session.metadata.workerId
                };
            case 'checkout.session.expired':
                return {
                    success: true,
                    status: 'FAILED',
                    reference: event.data.object.id
                };
            default:
                return { success: false };
        }
    }

    async handlePayPalWebhook(payload) {
        const event = payload;
        
        switch (event.event_type) {
            case 'CHECKOUT.ORDER.APPROVED':
                return {
                    success: true,
                    status: 'COMPLETED',
                    reference: event.resource.id,
                    transactionId: event.resource.id,
                    amount: parseFloat(event.resource.purchase_units[0].amount.value),
                    workerId: event.resource.purchase_units[0].custom_id
                };
            case 'CHECKOUT.ORDER.CANCELLED':
                return {
                    success: true,
                    status: 'FAILED',
                    reference: event.resource.id
                };
            default:
                return { success: false };
        }
    }

    async handleFlutterwaveWebhook(payload) {
        const event = payload;
        
        if (event.event === 'charge.completed' && event.data.status === 'successful') {
            return {
                success: true,
                status: 'COMPLETED',
                reference: event.data.tx_ref,
                transactionId: event.data.id,
                amount: event.data.amount,
                workerId: event.data.meta.workerId
            };
        }
        
        return { success: false };
    }

    async enqueuePayout(transactionId, workerId, amount) {
        // Import and use existing payout queue
        const { enqueuePayout } = await import('../payment-queue.js');
        return enqueuePayout(transactionId, workerId, amount, null);
    }
}