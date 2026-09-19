import { supabase } from './supabase'

export async function getGames() {
  const {
    data,
    error,
  } = await supabase
    .from('games')
    .select('*')
    .order(
      'created_at',
      {
        ascending: false,
      }
    )

  if (error) {
    throw error
  }

  return data
}

export async function getGame(
  gameId
) {
  const {
    data,
    error,
  } = await supabase
    .from('games')
    .select('*')
    .eq(
      'id',
      gameId
    )
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function getActiveGameForUser(
  userId
) {
  const {
    data,
    error,
  } = await supabase
    .from('games')
    .select('*')
    .or(
      `white_id.eq.${userId},black_id.eq.${userId}`
    )
    .in(
      'status',
      [
        'waiting',
        'playing',
      ]
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function joinGame(
  gameId,
  username
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'join_chess_game',
    {
      target_game_id:
        gameId,

      player_name:
        username,
    }
  )

  if (error) {
    throw error
  }

  return data
}

export async function submitMove({
  gameId,
  from,
  to,
  promotion = null,
}) {
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'chess-move',
      {
        body: {
          gameId,
          from,
          to,
          promotion,
        },
      }
    )

  if (error) {
    try {
      const response =
        error.context

      if (response) {
        const body =
          await response.json()

        if (body?.error) {
          throw new Error(
            body.error
          )
        }
      }
    } catch (
      responseError
    ) {
      if (
        responseError instanceof
          Error &&
        responseError.message !==
          error.message
      ) {
        throw responseError
      }
    }

    throw error
  }

  if (!data?.game) {
    throw new Error(
      'Move server returned an invalid response.'
    )
  }

  return data.game
}

export async function resignGame(
  gameId
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'resign_chess_game',
    {
      target_game_id:
        gameId,
    }
  )

  if (error) {
    throw error
  }

  return data
}

export async function cancelGame(
  gameId
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'cancel_chess_game',
    {
      target_game_id:
        gameId,
    }
  )

  if (error) {
    throw error
  }

  return data
}

export async function createGame(
  user,
  username
) {
  /*
   * Keep this check for better UX.
   *
   * It is NOT the security check.
   * create_chess_game() performs the
   * authoritative check server-side.
   */
  const existingGame =
    await getActiveGameForUser(
      user.id
    )

  if (existingGame) {
    const error =
      new Error(
        'You already have an active game.'
      )

    error.code =
      'ACTIVE_GAME_EXISTS'

    error.game =
      existingGame

    throw error
  }

  /*
   * The browser now sends ONLY the
   * display name.
   *
   * PostgreSQL controls:
   *
   * - auth user ID
   * - game ID
   * - player color
   * - starting FEN
   * - empty move history
   * - initial turn
   * - status
   * - winner/result
   */
  const {
    data,
    error,
  } = await supabase.rpc(
    'create_chess_game',
    {
      player_name:
        username,
    }
  )

  if (error) {
    /*
     * Preserve the error shape the UI
     * already understands when possible.
     */
    if (
      error.message
        ?.toLowerCase()
        .includes(
          'already have an active game'
        )
    ) {
      const activeGame =
        await getActiveGameForUser(
          user.id
        )

      const activeError =
        new Error(
          'You already have an active game.'
        )

      activeError.code =
        'ACTIVE_GAME_EXISTS'

      activeError.game =
        activeGame

      throw activeError
    }

    throw error
  }

  return data
}