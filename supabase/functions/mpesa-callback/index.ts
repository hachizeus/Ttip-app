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
        const amount = metadata.find((item: any) => item.Name === 'Amount')?.Value
        const receipt = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
        
        // Update tip status
        await supabase
          .from('tips')
          .update({ 
            status: 'completed',
            mpesa_receipt: receipt
          })
          .eq('transaction_id', Body.stkCallback.CheckoutRequestID)

        console.log('Tip updated:', { amount, receipt })
      } else {
        // Payment failed
        await supabase
          .from('tips')
          .update({ status: 'failed' })
          .eq('transaction_id', Body.stkCallback.CheckoutRequestID)
      }
    }

    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Success' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Callback error:', error)
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Success' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})