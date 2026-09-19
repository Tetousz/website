import { createClient } from 'npm:@supabase/supabase-js@2'
import { Chess } from 'npm:chess.js@1.4.0'

type StoredMove = {
  from: string
  to: string
  promotion?: string
}

type MoveRequest = {
  gameId?: string
  from?: string
  to?: string
  promotion?: string | null
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',

  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
}

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        ...corsHeaders,

        'Content-Type':
          'application/json',
      },
    },
  )
}

function errorResponse(
  message: string,
  status = 400,
) {
  return jsonResponse(
    {
      error: message,
    },
    status,
  )
}

function validSquare(
  square: unknown,
): square is string {
  return (
    typeof square === 'string' &&
    /^[a-h][1-8]$/.test(square)
  )
}

function validPromotion(
  promotion: unknown,
) {
  return (
    promotion === undefined ||
    promotion === null ||
    promotion === 'q' ||
    promotion === 'r' ||
    promotion === 'b' ||
    promotion === 'n'
  )
}

function reconstructGame(
  moves: StoredMove[],
) {
  const chess =
    new Chess()

  for (
    const storedMove of moves
  ) {
    const moveData: {
      from: string
      to: string
      promotion?: string
    } = {
      from:
        storedMove.from,

      to:
        storedMove.to,
    }

    if (
      storedMove.promotion
    ) {
      moveData.promotion =
        storedMove.promotion
    }

    chess.move(
      moveData
    )
  }

  return chess
}

function getGameResult(
  chess: Chess,
) {
  if (
    chess.isCheckmate()
  ) {
    return {
      finished: true,

      winner:
        chess.turn() === 'w'
          ? 'black'
          : 'white',

      result:
        'checkmate',
    }
  }

  if (
    chess.isStalemate()
  ) {
    return {
      finished: true,

      winner:
        'draw',

      result:
        'stalemate',
    }
  }

  if (
    chess.isThreefoldRepetition()
  ) {
    return {
      finished: true,

      winner:
        'draw',

      result:
        'threefold_repetition',
    }
  }

  if (
    chess.isInsufficientMaterial()
  ) {
    return {
      finished: true,

      winner:
        'draw',

      result:
        'insufficient_material',
    }
  }

  /*
   * chess.js exposes the halfmove
   * clock as part of FEN.
   *
   * 100 halfmoves = 50 moves.
   */
  const fenParts =
    chess.fen().split(' ')

  const halfmoveClock =
    Number(
      fenParts[4]
    )

  if (
    Number.isFinite(
      halfmoveClock
    ) &&
    halfmoveClock >= 100
  ) {
    return {
      finished: true,

      winner:
        'draw',

      result:
        'fifty_move_rule',
    }
  }

  if (
    chess.isDraw()
  ) {
    return {
      finished: true,

      winner:
        'draw',

      result:
        'draw',
    }
  }

  return {
    finished: false,
    winner: null,
    result: null,
  }
}

Deno.serve(
  async (request) => {
    /*
     * Browsers send an OPTIONS
     * preflight before the POST
     * because the request contains
     * Authorization and other
     * Supabase headers.
     */
    if (
      request.method ===
      'OPTIONS'
    ) {
      return new Response(
        'ok',
        {
          headers:
            corsHeaders,
        },
      )
    }

    try {
      if (
        request.method !==
        'POST'
      ) {
        return errorResponse(
          'Method not allowed.',
          405,
        )
      }

      const supabaseUrl =
        Deno.env.get(
          'SUPABASE_URL',
        )

      const anonKey =
        Deno.env.get(
          'SUPABASE_ANON_KEY',
        )

      const serviceRoleKey =
        Deno.env.get(
          'SUPABASE_SERVICE_ROLE_KEY',
        )

      if (
        !supabaseUrl ||
        !anonKey ||
        !serviceRoleKey
      ) {
        console.error(
          'Missing Supabase environment variables.',
        )

        return errorResponse(
          'Server configuration error.',
          500,
        )
      }

      /*
       * The browser's Supabase client
       * sends the logged-in anonymous
       * user's JWT here.
       */
      const authHeader =
        request.headers.get(
          'Authorization',
        )

      if (
        !authHeader
      ) {
        return errorResponse(
          'Missing authorization.',
          401,
        )
      }

      /*
       * User client:
       *
       * Used to verify that the JWT
       * actually belongs to a valid
       * authenticated Supabase user.
       */
      const userClient =
        createClient(
          supabaseUrl,
          anonKey,
          {
            global: {
              headers: {
                Authorization:
                  authHeader,
              },
            },

            auth: {
              persistSession:
                false,

              autoRefreshToken:
                false,
            },
          },
        )

      const {
        data: {
          user,
        },

        error:
          userError,
      } =
        await userClient.auth.getUser()

      if (
        userError ||
        !user
      ) {
        console.error(
          'Authentication failed:',
          userError,
        )

        return errorResponse(
          'Not authenticated.',
          401,
        )
      }

      /*
       * Admin client:
       *
       * Uses the service-role key and
       * therefore bypasses RLS.
       *
       * This key exists ONLY inside
       * the Edge Function.
       *
       * Never put it in the Vite
       * frontend or .env.local.
       */
      const adminClient =
        createClient(
          supabaseUrl,
          serviceRoleKey,
          {
            auth: {
              persistSession:
                false,

              autoRefreshToken:
                false,
            },
          },
        )

      let body:
        MoveRequest

      try {
        body =
          await request.json()
      } catch {
        return errorResponse(
          'Invalid JSON body.',
        )
      }

      const {
        gameId,
        from,
        to,
        promotion,
      } = body

      /*
       * Validate all client-controlled
       * input before using it.
       */
      if (
        typeof gameId !==
          'string' ||
        !/^[0-9]{4}$/.test(
          gameId
        )
      ) {
        return errorResponse(
          'Invalid game ID.',
        )
      }

      if (
        !validSquare(
          from
        )
      ) {
        return errorResponse(
          'Invalid starting square.',
        )
      }

      if (
        !validSquare(
          to
        )
      ) {
        return errorResponse(
          'Invalid destination square.',
        )
      }

      if (
        !validPromotion(
          promotion
        )
      ) {
        return errorResponse(
          'Invalid promotion.',
        )
      }

      /*
       * Load the authoritative state
       * directly from the database.
       */
      const {
        data:
          game,

        error:
          gameError,
      } =
        await adminClient
          .from(
            'games'
          )
          .select(
            '*'
          )
          .eq(
            'id',
            gameId
          )
          .maybeSingle()

      if (
        gameError
      ) {
        console.error(
          'Game load error:',
          gameError,
        )

        return errorResponse(
          'Could not load game.',
          500,
        )
      }

      if (
        !game
      ) {
        return errorResponse(
          'Game not found.',
          404,
        )
      }

      if (
        game.status !==
        'playing'
      ) {
        return errorResponse(
          'Game is not playing.',
          409,
        )
      }

      /*
       * Determine which side the
       * authenticated user owns.
       */
      let playerColor:
        | 'w'
        | 'b'
        | null =
        null

      if (
        game.white_id ===
        user.id
      ) {
        playerColor =
          'w'
      } else if (
        game.black_id ===
        user.id
      ) {
        playerColor =
          'b'
      }

      if (
        !playerColor
      ) {
        return errorResponse(
          'You are not a player in this game.',
          403,
        )
      }

      /*
       * Don't trust the browser to
       * tell us whose turn it is.
       */
      if (
        game.turn !==
        playerColor
      ) {
        return errorResponse(
          'It is not your turn.',
          403,
        )
      }

      /*
       * Reconstruct the complete game
       * from our stored authoritative
       * move history.
       *
       * This also reconstructs the
       * repetition history needed for
       * threefold repetition.
       */
      const storedMoves:
        StoredMove[] =
        Array.isArray(
          game.moves
        )
          ? game.moves
          : []

      let chess:
        Chess

      try {
        chess =
          reconstructGame(
            storedMoves
          )
      } catch (
        error
      ) {
        console.error(
          'Stored move history is invalid:',
          error,
        )

        return errorResponse(
          'Stored game history is invalid.',
          500,
        )
      }

      /*
       * Make sure nobody has somehow
       * created a mismatch between the
       * stored FEN and move history.
       */
      if (
        chess.fen() !==
        game.fen
      ) {
        console.error(
          'Game FEN/history mismatch:',
          {
            gameId,

            databaseFen:
              game.fen,

            reconstructedFen:
              chess.fen(),
          },
        )

        return errorResponse(
          'Game position is inconsistent.',
          409,
        )
      }

      /*
       * SECURITY BOUNDARY
       * -----------------
       *
       * The browser requested a move.
       *
       * chess.js running on the server
       * decides whether that move is
       * actually legal.
       */
      let move

      try {
        move =
          chess.move({
            from,
            to,

            ...(promotion
              ? {
                  promotion,
                }
              : {}),
          })
      } catch {
        return errorResponse(
          'Illegal move.',
          400,
        )
      }

      if (
        !move
      ) {
        return errorResponse(
          'Illegal move.',
          400,
        )
      }

      /*
       * Store only what is required
       * to reconstruct this move.
       */
      const storedMove:
        StoredMove = {
        from:
          move.from,

        to:
          move.to,
      }

      if (
        move.promotion
      ) {
        storedMove.promotion =
          move.promotion
      }

      const newMoves = [
        ...storedMoves,
        storedMove,
      ]

      /*
       * All authoritative state is
       * generated server-side.
       */
      const gameResult =
        getGameResult(
          chess
        )

      const updateData = {
        fen:
          chess.fen(),

        pgn:
          chess.pgn(),

        moves:
          newMoves,

        turn:
          chess.turn(),

        status:
          gameResult.finished
            ? 'finished'
            : 'playing',

        winner:
          gameResult.finished
            ? gameResult.winner
            : null,

        result:
          gameResult.finished
            ? gameResult.result
            : null,
      }

      /*
       * Optimistic concurrency:
       *
       * Only save this move if the
       * position is STILL the same
       * position we loaded above.
       *
       * If another request changed
       * the game first, the FEN won't
       * match and zero rows are
       * updated.
       */
      const {
        data:
          updatedGame,

        error:
          updateError,
      } =
        await adminClient
          .from(
            'games'
          )
          .update(
            updateData
          )
          .eq(
            'id',
            gameId
          )
          .eq(
            'fen',
            game.fen
          )
          .eq(
            'status',
            'playing'
          )
          .select()
          .maybeSingle()

      if (
        updateError
      ) {
        console.error(
          'Game update error:',
          updateError,
        )

        return errorResponse(
          'Could not save move.',
          500,
        )
      }

      if (
        !updatedGame
      ) {
        return errorResponse(
          'The position changed before the move could be saved.',
          409,
        )
      }

      return jsonResponse(
        {
          game:
            updatedGame,
        }
      )
    } catch (
      error
    ) {
      console.error(
        'Unhandled chess-move error:',
        error,
      )

      return errorResponse(
        'Internal server error.',
        500,
      )
    }
  },
)