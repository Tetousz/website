import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value)

  const digest = await crypto.subtle.digest(
    'SHA-256',
    data
  )

  return Array.from(new Uint8Array(digest))
    .map((byte) =>
      byte.toString(16).padStart(2, '0')
    )
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  try {
    const supabaseUrl =
      Deno.env.get('SUPABASE_URL')

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY'
      )

    const hashSecret =
      Deno.env.get('VISITOR_HASH_SECRET')

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !hashSecret
    ) {
      throw new Error(
        'Required server configuration is missing'
      )
    }

    /*
     * Get the visitor's IP.
     */
    const forwardedFor =
      req.headers.get('x-forwarded-for')

    const realIp =
      req.headers.get('x-real-ip')

    const connectingIp =
      forwardedFor
        ?.split(',')[0]
        ?.trim() ||
      realIp?.trim()

    if (!connectingIp) {
      throw new Error(
        'Could not determine visitor identifier'
      )
    }

    /*
     * Never store the raw IP.
     */
    const visitorHash = await sha256(
      `${hashSecret}:${connectingIp}`
    )

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    /*
     * FIRST check whether this visitor already exists.
     *
     * This prevents every page refresh from attempting
     * an INSERT and wasting another PostgreSQL ID.
     */
    const {
      data: existingVisitor,
      error: existingVisitorError,
    } = await supabase
      .from('site_visitors')
      .select('id')
      .eq('visitor_hash', visitorHash)
      .maybeSingle()

    if (existingVisitorError) {
      console.error(
        'Visitor lookup failed:',
        existingVisitorError
      )

      throw new Error(
        'Could not look up visitor'
      )
    }

    let visitor = existingVisitor
    let returning = true

    /*
     * Only INSERT when this is actually a new visitor.
     */
    if (!visitor) {
      returning = false

      const {
        data: newVisitor,
        error: insertError,
      } = await supabase
        .from('site_visitors')
        .insert({
          visitor_hash: visitorHash,
        })
        .select('id')
        .single()

      if (insertError || !newVisitor) {
        console.error(
          'Visitor insert failed:',
          insertError
        )

        throw new Error(
          'Could not register visitor'
        )
      }

      visitor = newVisitor
    }

    /*
     * IMPORTANT:
     *
     * The database ID is NOT the visitor number.
     *
     * Example database:
     *
     * id 1
     * id 36
     * id 40
     *
     * Those should display as:
     *
     * visitor #1
     * visitor #2
     * visitor #3
     *
     * Count all existing rows whose ID is less than
     * or equal to this visitor's ID.
     */
    const {
      count: visitorNumber,
      error: visitorNumberError,
    } = await supabase
      .from('site_visitors')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .lte('id', visitor.id)

    if (visitorNumberError) {
      console.error(
        'Visitor number calculation failed:',
        visitorNumberError
      )

      throw new Error(
        'Could not determine visitor number'
      )
    }

    /*
     * Count all unique visitors.
     */
    const {
      count: totalVisitors,
      error: totalVisitorsError,
    } = await supabase
      .from('site_visitors')
      .select('id', {
        count: 'exact',
        head: true,
      })

    if (totalVisitorsError) {
      console.error(
        'Total visitor count failed:',
        totalVisitorsError
      )

      throw new Error(
        'Could not count visitors'
      )
    }

    return new Response(
      JSON.stringify({
        visitorNumber:
          visitorNumber ?? 0,

        totalVisitors:
          totalVisitors ?? 0,

        returning,
      }),
      {
        headers: {
          ...corsHeaders,

          'Content-Type':
            'application/json',

          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error(error)

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error',
      }),
      {
        status: 500,

        headers: {
          ...corsHeaders,

          'Content-Type':
            'application/json',
        },
      }
    )
  }
})