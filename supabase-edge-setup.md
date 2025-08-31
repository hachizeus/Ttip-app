# Supabase Edge Functions for M-Pesa Callbacks

## 1. Install Supabase CLI
```bash
npm install -g supabase
```

## 2. Initialize Supabase
```bash
supabase init
supabase login
supabase link --project-ref cpbonffjhrckiiqbsopt
```

## 3. Create Edge Function
```bash
supabase functions new mpesa-callback
```

## 4. Edge Function Code
File: `supabase/functions/mpesa-callback/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log('M-Pesa Callback:', body)

    const { Body } = body
    if (Body?.stkCallback) {
      const { ResultCode, CallbackMetadata } = Body.stkCallback
      
      if (ResultCode === 0) {
        const metadata = CallbackMetadata?.Item || []
        const amount = metadata.find(item => item.Name === 'Amount')?.Value
        const receipt = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value
        
        // Update tip status
        await supabase
          .from('tips')
          .update({ 
            status: 'completed',
            mpesa_receipt: receipt
          })
          .eq('transaction_id', Body.stkCallback.CheckoutRequestID)
      }
    }

    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Success' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## 5. Deploy Function
```bash
supabase functions deploy mpesa-callback
```

## 6. Get Function URL
Your callback URL will be:
`https://cpbonffjhrckiiqbsopt.supabase.co/functions/v1/mpesa-callback`

## 7. Update M-Pesa Backend
Update `.env` file:
```env
CALLBACK_URL=https://cpbonffjhrckiiqbsopt.supabase.co/functions/v1/mpesa-callback
```

## 8. Test Complete Flow
```bash
node test-daraja.js
```

This gives you a public HTTPS callback URL for M-Pesa without deploying a full backend!