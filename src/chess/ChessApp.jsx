import {

  useEffect,

  useState,

} from 'react'

import './ChessApp.css'

import {

  getGame,

  cancelGame,

  resignGame,

  claimChessTimeout,

} from './lib/games'

import {

  supabase,

} from './lib/supabase'

import ChessBoard from './components/ChessBoard'

import MoveHistory from './components/MoveHistory'

import Lobby from './components/Lobby'

import {

  getUsername,

} from './lib/identity'

import {

  ensureAnonymousUser,

} from './lib/auth'

function ChessApp() {

  const [theme, setTheme] =
    useState(() => {
      const saved =
        localStorage.getItem(
          'ferretusz-theme'
        )

      if (
        saved === 'light' ||
        saved === 'dark'
      ) {
        return saved
      }

      return window.matchMedia?.(
        '(prefers-color-scheme: dark)'
      ).matches
        ? 'dark'
        : 'light'
    })

  useEffect(() => {
    document.documentElement.dataset.theme =
      theme

    localStorage.setItem(
      'ferretusz-theme',
      theme
    )
  }, [
    theme,
  ])

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

      <div
        className="chess-background-mark chess-mark-one"
        aria-hidden="true"
      >
        棋
      </div>

      <div
        className="chess-background-mark chess-mark-two"
        aria-hidden="true"
      >
        弈
      </div>

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

            Home

          </a>

          <button
            type="button"
            className="chess-theme-switch"
            onClick={() =>
              setTheme(
                (current) =>
                  current === 'light'
                    ? 'dark'
                    : 'light'
              )
            }
            aria-label={`Switch to ${
              theme === 'light'
                ? 'dark'
                : 'light'
            } mode`}
          >
            <span className="chess-theme-symbol">
              {theme === 'light'
                ? '月'
                : '日'}
            </span>

            <span>
              {theme === 'light'
                ? 'DARK'
                : 'LIGHT'}
            </span>
          </button>

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


  const [
    clockNow,
    setClockNow,
  ] = useState(
    Date.now()
  )

  const [
    claimingTimeout,
    setClaimingTimeout,
  ] = useState(false)


  /*
   * null = LIVE position.
   * A number = how many half-moves (plies) are being reviewed.
   * 0 means the initial starting position.
   */
  const [
    reviewPly,
    setReviewPly,
  ] = useState(null)


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

  }, [

    gameCode,

  ])

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

            setGame(

              payload.new

            )

          }

        )

        .subscribe()

    return () => {

      supabase.removeChannel(

        channel

      )

    }

  }, [

    gameCode,

  ])

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

      playerColor =

        'w'

    } else if (

      game.black_id ===

      currentUser.id

    ) {

      playerColor =

        'b'

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

  /*
   * Move-history keyboard navigation.
   *
   * Left Arrow:
   *   LIVE -> previous position
   *   review -> one move backward
   *
   * Right Arrow:
   *   review -> one move forward
   *   final position -> LIVE
   */
  useEffect(() => {
    if (
      game?.status !==
      'playing'
    ) {
      return
    }

    setClockNow(Date.now())

    const timer =
      window.setInterval(
        () => {
          setClockNow(
            Date.now()
          )
        },
        250
      )

    return () => {
      window.clearInterval(
        timer
      )
    }
  }, [
    game?.status,
    game?.clock_started_at,
    game?.turn,
  ])

  function getClockTime(color) {
    if (!game) {
      return 600000
    }

    const field =
      color === 'w'
        ? 'white_time_ms'
        : 'black_time_ms'

    const stored =
      Number(
        game[field] ??
        600000
      )

    if (
      game.status !== 'playing' ||
      game.turn !== color ||
      !game.clock_started_at
    ) {
      return Math.max(
        0,
        stored
      )
    }

    const startedAt =
      new Date(
        game.clock_started_at
      ).getTime()

    if (
      !Number.isFinite(
        startedAt
      )
    ) {
      return Math.max(
        0,
        stored
      )
    }

    return Math.max(
      0,
      stored -
        Math.max(
          0,
          clockNow -
            startedAt
        )
    )
  }

  const liveWhiteClockMs =
    getClockTime('w')

  const liveBlackClockMs =
    getClockTime('b')

  /*
   * Every new move stores an authoritative snapshot of
   * BOTH clocks. While reviewing, use that snapshot
   * instead of the live clocks. Ply 0 is the initial
   * 10:00 / 10:00 position.
   */
  const reviewedMove =
    reviewPly !== null &&
    reviewPly > 0 &&
    Array.isArray(game?.moves)
      ? game.moves[
          reviewPly - 1
        ]
      : null

  const reviewWhiteClockMs =
    reviewPly === 0
      ? 600000
      : Number.isFinite(
          Number(
            reviewedMove?.whiteTimeMs
          )
        )
        ? Number(
            reviewedMove.whiteTimeMs
          )
        : null

  const reviewBlackClockMs =
    reviewPly === 0
      ? 600000
      : Number.isFinite(
          Number(
            reviewedMove?.blackTimeMs
          )
        )
        ? Number(
            reviewedMove.blackTimeMs
          )
        : null

  const whiteClockMs =
    reviewPly === null
      ? liveWhiteClockMs
      : reviewWhiteClockMs

  const blackClockMs =
    reviewPly === null
      ? liveBlackClockMs
      : reviewBlackClockMs

  useEffect(() => {
    if (
      game?.status !==
        'playing' ||
      claimingTimeout
    ) {
      return
    }

    const activeClock =
      game.turn === 'w'
        ? liveWhiteClockMs
        : liveBlackClockMs

    if (activeClock > 0) {
      return
    }

    let cancelled = false

    async function finishTimeout() {
      setClaimingTimeout(true)

      try {
        const updatedGame =
          await claimChessTimeout(
            game.id
          )

        if (
          !cancelled &&
          updatedGame
        ) {
          setGame(updatedGame)
        }
      } catch (error) {
        console.error(
          'Failed to claim timeout:',
          error
        )
      } finally {
        if (!cancelled) {
          setClaimingTimeout(false)
        }
      }
    }

    finishTimeout()

    return () => {
      cancelled = true
    }
  }, [
    game?.id,
    game?.status,
    game?.turn,
    liveWhiteClockMs,
    liveBlackClockMs,
    claimingTimeout,
  ])

  function formatClock(
    milliseconds
  ) {
    if (
      milliseconds === null ||
      milliseconds === undefined ||
      !Number.isFinite(
        Number(milliseconds)
      )
    ) {
      return '--:--'
    }

    const totalSeconds =
      Math.max(
        0,
        Math.ceil(
          milliseconds /
          1000
        )
      )

    const minutes =
      Math.floor(
        totalSeconds / 60
      )

    const seconds =
      totalSeconds % 60

    return `${minutes}:${String(
      seconds
    ).padStart(2, '0')}`
  }

  function PlayerClock({
    color,
  }) {
    const isWhite =
      color === 'w'

    const milliseconds =
      isWhite
        ? whiteClockMs
        : blackClockMs

    const name =
      isWhite
        ? game?.white_name
        : game?.black_name

    const displayedTurn =
      reviewPly === null
        ? game?.turn
        : reviewPly % 2 === 0
          ? 'w'
          : 'b'

    const isActive =
      reviewPly !== null
        ? displayedTurn === color
        : game?.status ===
            'playing' &&
          displayedTurn === color

    return (
      <div
        className={[
          'player-clock',
          isActive
            ? 'active'
            : '',
          milliseconds !== null &&
          milliseconds <= 30000
            ? 'low-time'
            : '',
        ].join(' ')}
      >
        <div className="player-clock-name">
          <span className="player-clock-piece">
            {isWhite
              ? '♔'
              : '♚'}
          </span>

          <span>
            {name ||
              (isWhite
                ? 'White'
                : 'Black')}
          </span>

          {isActive && (
            <span className="player-clock-turn">
              TURN
            </span>
          )}
        </div>

        <div className="player-clock-time">
          {formatClock(
            milliseconds
          )}
        </div>
      </div>
    )
  }

  useEffect(() => {
    function handleHistoryKeyDown(event) {
      if (
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight'
      ) {
        return
      }

      const target = event.target

      if (
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT'
        )
      ) {
        return
      }

      const moveCount =
        Array.isArray(game?.moves)
          ? game.moves.length
          : 0

      if (moveCount === 0) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()

        setReviewPly((current) => {
          if (current === null) {
            return Math.max(
              0,
              moveCount - 1
            )
          }

          return Math.max(
            0,
            current - 1
          )
        })

        return
      }

      if (reviewPly === null) {
        return
      }

      event.preventDefault()

      setReviewPly((current) => {
        if (current === null) {
          return null
        }

        const next =
          current + 1

        if (next >= moveCount) {
          return null
        }

        return next
      })
    }

    window.addEventListener(
      'keydown',
      handleHistoryKeyDown
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleHistoryKeyDown
      )
    }
  }, [
    game?.moves,
    reviewPly,
  ])

  function handleSelectHistoryPly(
    ply
  ) {
    const moveCount =
      Array.isArray(game?.moves)
        ? game.moves.length
        : 0

    if (
      ply === null ||
      ply >= moveCount
    ) {
      setReviewPly(null)
      return
    }

    setReviewPly(
      Math.max(
        0,
        ply
      )
    )
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

      'timeout'

    ) {

      if (

        game.winner ===

        'white'

      ) {

        return (

          'White wins on time.'

        )

      }

      if (

        game.winner ===

        'black'

      ) {

        return (

          'Black wins on time.'

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

      <div className="game-play-area">

        <div className="board-clock-column">

          <PlayerClock
            color={
              playerColor === 'b'
                ? 'w'
                : 'b'
            }
          />

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

          moves={

            game.moves || []

          }

          reviewPly={
            reviewPly
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

          <PlayerClock
            color={
              playerColor === 'b'
                ? 'b'
                : 'w'
            }
          />

        </div>

        <MoveHistory

          moves={

            game.moves || []

          }

          reviewPly={
            reviewPly
          }

          onSelectPly={
            handleSelectHistoryPly
          }

        />

      </div>

    </div>

  )

}

export default ChessApp