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
     * Supabase/its proxy forwards the connecting
     * client's address to the Edge Function.
     *
     * We never store the raw address.
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
     * Salt/hash immediately. Only this irreversible
     * identifier is sent to the database.
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
     * Try inserting the visitor.
     *
     * visitor_hash is UNIQUE, so a refresh from the
     * same visitor cannot create another row.
     */
    const { error: insertError } =
      await supabase
        .from('site_visitors')
        .insert({
          visitor_hash: visitorHash,
        })

    /*
     * PostgreSQL error 23505 = unique violation.
     * That's expected for a returning visitor.
     */
    if (
      insertError &&
      insertError.code !== '23505'
    ) {
      console.error(
        'Visitor insert failed:',
        insertError
      )

      throw new Error(
        'Could not register visitor'
      )
    }

    /*
     * Get this visitor's database ID.
     *
     * We DON'T display this ID directly because
     * PostgreSQL sequence IDs can contain gaps.
     */
    const {
      data: visitor,
      error: visitorError,
    } = await supabase
      .from('site_visitors')
      .select('id')
      .eq('visitor_hash', visitorHash)
      .single()

    if (visitorError || !visitor) {
      console.error(
        'Visitor lookup failed:',
        visitorError
      )

      throw new Error(
        'Could not retrieve visitor'
      )
    }

    /*
     * Calculate this visitor's actual ordinal among
     * the visitor rows that currently exist.
     *
     * Example:
     *
     * Database IDs:
     *   27
     *   28
     *
     * Displayed visitor numbers:
     *   1
     *   2
     */
    const {
      count: visitorNumber,
      error: ordinalError,
    } = await supabase
      .from('site_visitors')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .lte('id', visitor.id)

    if (ordinalError) {
      console.error(
        'Visitor ordinal lookup failed:',
        ordinalError
      )

      throw new Error(
        'Could not determine visitor number'
      )
    }

    /*
     * Get total unique visitors.
     */
    const {
      count: totalVisitors,
      error: countError,
    } = await supabase
      .from('site_visitors')
      .select('*', {
        count: 'exact',
        head: true,
      })

    if (countError) {
      console.error(
        'Visitor count failed:',
        countError
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
        returning:
          insertError?.code === '23505',
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