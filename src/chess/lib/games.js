import { supabase } from './supabase'

const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function generateGameId() {
  return Math.floor(
    Math.random() * 10000
  )
    .toString()
    .padStart(4, '0')
}

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
    /*
     * Supabase Function errors don't
     * always expose the JSON response
     * message directly through
     * error.message.
     *
     * Try to read the function's
     * response body so errors such as
     * "Illegal move." are visible in
     * the UI.
     */
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

  for (
    let attempt = 0;
    attempt < 20;
    attempt++
  ) {
    const gameId =
      generateGameId()

    const existingId =
      await getGame(
        gameId
      )

    if (existingId) {
      continue
    }

    const creatorIsWhite =
      Math.random() < 0.5

    const game = {
      id:
        gameId,

      status:
        'waiting',

      white_id:
        creatorIsWhite
          ? user.id
          : null,

      white_name:
        creatorIsWhite
          ? username
          : null,

      black_id:
        creatorIsWhite
          ? null
          : user.id,

      black_name:
        creatorIsWhite
          ? null
          : username,

      fen:
        STARTING_FEN,

      pgn:
        '',

      moves:
        [],

      turn:
        'w',

      winner:
        null,

      result:
        null,
    }

    const {
      data,
      error,
    } = await supabase
      .from('games')
      .insert(game)
      .select()
      .single()

    if (!error) {
      return data
    }

    if (
      error.code ===
      '23505'
    ) {
      continue
    }

    throw error
  }

  throw new Error(
    'Could not generate an available game ID.'
  )
}