import {
  useEffect,
  useState,
} from 'react'

import './ChessApp.css'

import {
  getGame,
  cancelGame,
  resignGame,
} from './lib/games'

import {
  supabase,
} from './lib/supabase'

import ChessBoard from './components/ChessBoard'
import Lobby from './components/Lobby'

import {
  getUsername,
} from './lib/identity'

import {
  ensureAnonymousUser,
} from './lib/auth'

function ChessApp() {
  useEffect(() => {
    async function initializeChess() {
      try {
        await ensureAnonymousUser()
      } catch (error) {
        console.error(
          'Failed to initialize chess backend:',
          error
        )
      }
    }

    initializeChess()
  }, [])

  const path =
    window.location.pathname

  const gameMatch =
    path.match(
      /^\/chess\/id\/(\d{4})\/?$/
    )

  const gameCode =
    gameMatch
      ? gameMatch[1]
      : null

  return (
    <div className="chess-app">
      <header className="chess-header">

        <a
          href="/chess"
          className="chess-logo"
        >
          Ferretusz Chess
        </a>

        <div className="chess-header-right">

          {getUsername() && (
            <span className="header-username">
              {getUsername()}
            </span>
          )}

          <a
            href="/"
            className="portfolio-link"
          >
            Portfolio
          </a>

        </div>
      </header>

      <main className="chess-main">

        {gameCode ? (
          <GamePage
            gameCode={
              gameCode
            }
          />
        ) : (
          <Lobby />
        )}

      </main>
    </div>
  )
}

function GamePage({
  gameCode,
}) {
  const [
    game,
    setGame,
  ] = useState(null)

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    cancelling,
    setCancelling,
  ] = useState(false)

  const [
    resigning,
    setResigning,
  ] = useState(false)

  useEffect(() => {
    async function loadGame() {
      try {
        setLoading(true)
        setError('')

        const user =
          await ensureAnonymousUser()

        setCurrentUser(
          user
        )

        const gameData =
          await getGame(
            gameCode
          )

        if (!gameData) {
          setError(
            'Game not found.'
          )
          return
        }

        setGame(
          gameData
        )
      } catch (error) {
        console.error(
          'Failed to load game:',
          error
        )

        setError(
          'Could not load this game.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadGame()
  }, [gameCode])

  useEffect(() => {
    const channel =
      supabase
        .channel(
          `chess-game-${gameCode}`
        )
        .on(
          'postgres_changes',
          {
            event:
              'UPDATE',

            schema:
              'public',

            table:
              'games',

            filter:
              `id=eq.${gameCode}`,
          },
          (payload) => {
            console.log(
              'Realtime game update:',
              payload.new
            )

            setGame(
              payload.new
            )
          }
        )
        .subscribe(
          (status) => {
            console.log(
              'Realtime status:',
              status
            )
          }
        )

    return () => {
      supabase.removeChannel(
        channel
      )
    }
  }, [gameCode])

  let playerColor =
    null

  if (
    currentUser &&
    game
  ) {
    if (
      game.white_id ===
      currentUser.id
    ) {
      playerColor = 'w'
    } else if (
      game.black_id ===
      currentUser.id
    ) {
      playerColor = 'b'
    }
  }

  const isPlayer =
    playerColor === 'w' ||
    playerColor === 'b'

  const isWaiting =
    game?.status ===
    'waiting'

  const isPlaying =
    game?.status ===
    'playing'

  const isFinished =
    game?.status ===
    'finished'

  async function handleCancelGame() {
    if (
      !game ||
      !isPlayer ||
      !isWaiting
    ) {
      return
    }

    const confirmed =
      window.confirm(
        'Cancel this game?'
      )

    if (!confirmed) {
      return
    }

    setCancelling(
      true
    )

    try {
      await cancelGame(
        game.id
      )

      window.location.href =
        '/chess'
    } catch (error) {
      console.error(
        'Failed to cancel game:',
        error
      )

      window.alert(
        'Could not cancel the game.'
      )

      setCancelling(
        false
      )
    }
  }

  async function handleResignGame() {
    if (
      !game ||
      !isPlayer ||
      !isPlaying ||
      resigning
    ) {
      return
    }

    const confirmed =
      window.confirm(
        'Are you sure you want to resign? Your opponent will win the game.'
      )

    if (!confirmed) {
      return
    }

    setResigning(
      true
    )

    try {
      const updatedGame =
        await resignGame(
          game.id
        )

      setGame(
        updatedGame
      )
    } catch (error) {
      console.error(
        'Failed to resign game:',
        error
      )

      window.alert(
        'Could not resign the game.'
      )
    } finally {
      setResigning(
        false
      )
    }
  }

  function getResultText() {
    if (
      !game ||
      !isFinished
    ) {
      return null
    }

    if (
      game.result ===
      'checkmate'
    ) {
      if (
        game.winner ===
        'white'
      ) {
        return (
          'White wins by checkmate.'
        )
      }

      if (
        game.winner ===
        'black'
      ) {
        return (
          'Black wins by checkmate.'
        )
      }
    }

    if (
      game.result ===
      'resignation'
    ) {
      if (
        game.winner ===
        'white'
      ) {
        return (
          'White wins by resignation.'
        )
      }

      if (
        game.winner ===
        'black'
      ) {
        return (
          'Black wins by resignation.'
        )
      }
    }

    if (
      game.result ===
      'stalemate'
    ) {
      return (
        'Draw by stalemate.'
      )
    }

    if (
      game.result ===
      'threefold_repetition'
    ) {
      return (
        'Draw by threefold repetition.'
      )
    }

    if (
      game.result ===
      'insufficient_material'
    ) {
      return (
        'Draw by insufficient material.'
      )
    }

    if (
      game.result ===
      'fifty_move_rule'
    ) {
      return (
        'Draw by fifty-move rule.'
      )
    }

    if (
      game.result ===
      'draw'
    ) {
      return 'Draw.'
    }

    if (
      game.result ===
      'cancelled'
    ) {
      return (
        'Game cancelled.'
      )
    }

    if (
      game.winner ===
      'white'
    ) {
      return (
        'White wins.'
      )
    }

    if (
      game.winner ===
      'black'
    ) {
      return (
        'Black wins.'
      )
    }

    if (
      game.winner ===
      'draw'
    ) {
      return 'Draw.'
    }

    return (
      'Game finished.'
    )
  }

  if (loading) {
    return (
      <div className="game-page">

        <div className="game-warning">
          Loading game #
          {gameCode}...
        </div>

      </div>
    )
  }

  if (error) {
    return (
      <div className="game-page">

        <div className="game-page-top">

          <div>
            <span className="game-code-label">
              GAME
            </span>

            <h1>
              #{gameCode}
            </h1>
          </div>

          <a
            href="/chess"
            className="back-lobby-button"
          >
            ← Lobby
          </a>

        </div>

        <div className="game-warning">
          {error}
        </div>

      </div>
    )
  }

  return (
    <div className="game-page">

      <div className="game-page-top">

        <div>
          <span className="game-code-label">
            GAME
          </span>

          <h1>
            #{game.id}
          </h1>
        </div>

        <a
          href="/chess"
          className="back-lobby-button"
        >
          ← Lobby
        </a>

      </div>

      <div className="game-room-info">

        <div>
          <strong>
            White:
          </strong>{' '}
          {game.white_name ||
            'Waiting...'}
        </div>

        <div>
          <strong>
            Black:
          </strong>{' '}
          {game.black_name ||
            'Waiting...'}
        </div>

        <div>
          <strong>
            Status:
          </strong>{' '}
          {game.status}
        </div>

        <div>
          <strong>
            You:
          </strong>{' '}
          {playerColor === 'w'
            ? 'White'
            : playerColor === 'b'
              ? 'Black'
              : 'Spectator'}
        </div>

        {isWaiting &&
          isPlayer && (
            <div>
              Waiting for another
              player to join...
            </div>
          )}

        {isWaiting &&
          !isPlayer && (
            <div>
              This game is waiting
              for an opponent.
            </div>
          )}

        {isPlaying &&
          isPlayer && (
            <div>
              Game in progress.
            </div>
          )}

        {isPlaying &&
          !isPlayer && (
            <div>
              Spectating game.
            </div>
          )}

        {isFinished && (
          <div>
            <strong>
              Result:
            </strong>{' '}
            {getResultText()}
          </div>
        )}

      </div>

      {isWaiting &&
        isPlayer && (
          <button
            type="button"
            className="restart-button"
            onClick={
              handleCancelGame
            }
            disabled={
              cancelling
            }
          >
            {cancelling
              ? 'Cancelling...'
              : 'Cancel Game'}
          </button>
        )}

      {isPlaying &&
        isPlayer && (
          <button
            type="button"
            className="restart-button"
            onClick={
              handleResignGame
            }
            disabled={
              resigning
            }
          >
            {resigning
              ? 'Resigning...'
              : 'Resign'}
          </button>
        )}

      <ChessBoard
        gameId={
          game.id
        }

        playerColor={
          playerColor
        }

        fen={
          game.fen
        }

        gameStatus={
          game.status
        }

        winner={
          game.winner
        }

        result={
          game.result
        }

        onGameUpdate={
          setGame
        }
      />

    </div>
  )
}

export default ChessApp