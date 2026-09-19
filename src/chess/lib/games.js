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
  expectedFen,
  newFen,
  newPgn,
  newMoves,
  newTurn,

  gameFinished = false,
  gameWinner = null,
  gameResult = null,
}) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'submit_chess_move',
    {
      target_game_id:
        gameId,

      expected_fen:
        expectedFen,

      new_fen:
        newFen,

      new_pgn:
        newPgn,

      new_moves:
        newMoves,

      new_turn:
        newTurn,

      game_finished:
        gameFinished,

      game_winner:
        gameWinner,

      game_result:
        gameResult,
    }
  )

  if (error) {
    throw error
  }

  return data
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