import {
  useEffect,
  useState,
} from 'react'

import UsernameInput from './UsernameInput'

import {
  getUsername,
  saveUsername,
  validateUsername,
} from '../lib/identity'

import {
  ensureAnonymousUser,
} from '../lib/auth'

import {
  createGame,
  getGames,
  joinGame as joinDatabaseGame,
} from '../lib/games'

import {
  supabase,
} from '../lib/supabase'

function Lobby() {
  const [
    username,
    setUsername,
  ] = useState(
    () => getUsername()
  )

  const [
    usernameError,
    setUsernameError,
  ] = useState('')

  const [
    gameCode,
    setGameCode,
  ] = useState('')

  const [
    codeError,
    setCodeError,
  ] = useState('')

  const [
    creatingGame,
    setCreatingGame,
  ] = useState(false)

  const [
    gameError,
    setGameError,
  ] = useState('')

  const [
    games,
    setGames,
  ] = useState([])

  const [
    loadingGames,
    setLoadingGames,
  ] = useState(true)

  const [
    gamesError,
    setGamesError,
  ] = useState('')

  const [
    joiningGameId,
    setJoiningGameId,
  ] = useState(null)

  useEffect(() => {
    async function loadGames() {
      try {
        setLoadingGames(true)
        setGamesError('')

        await ensureAnonymousUser()

        const gameList =
          await getGames()

        setGames(
          gameList || []
        )
      } catch (error) {
        console.error(
          'Failed to load games:',
          error
        )

        setGamesError(
          'Could not load games.'
        )
      } finally {
        setLoadingGames(false)
      }
    }

    loadGames()
  }, [])

  /*
   * Realtime lobby updates.
   *
   * This means games automatically:
   *
   * waiting -> playing
   * playing -> finished
   *
   * without refreshing the lobby.
   */
  useEffect(() => {
    const channel =
      supabase
        .channel(
          'chess-lobby-games'
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'games',
          },
          (payload) => {
            if (
              payload.eventType ===
              'INSERT'
            ) {
              setGames(
                (currentGames) => {
                  const exists =
                    currentGames.some(
                      (game) =>
                        game.id ===
                        payload.new.id
                    )

                  if (exists) {
                    return currentGames
                  }

                  return [
                    payload.new,
                    ...currentGames,
                  ]
                }
              )

              return
            }

            if (
              payload.eventType ===
              'UPDATE'
            ) {
              setGames(
                (currentGames) =>
                  currentGames.map(
                    (game) =>
                      game.id ===
                      payload.new.id
                        ? payload.new
                        : game
                  )
              )

              return
            }

            if (
              payload.eventType ===
              'DELETE'
            ) {
              setGames(
                (currentGames) =>
                  currentGames.filter(
                    (game) =>
                      game.id !==
                      payload.old.id
                  )
              )
            }
          }
        )
        .subscribe(
          (status) => {
            console.log(
              'Lobby realtime status:',
              status
            )
          }
        )

    return () => {
      supabase.removeChannel(
        channel
      )
    }
  }, [])

  function prepareUsername() {
    const error =
      validateUsername(
        username
      )

    if (error) {
      setUsernameError(
        error
      )

      return false
    }

    setUsernameError('')
    saveUsername(username)

    return true
  }

  function handleUsernameChange(
    value
  ) {
    setUsername(value)

    if (usernameError) {
      setUsernameError('')
    }

    if (gameError) {
      setGameError('')
    }
  }

  async function handleCreateGame() {
    if (
      !prepareUsername()
    ) {
      return
    }

    setGameError('')
    setCreatingGame(true)

    try {
      const user =
        await ensureAnonymousUser()

      const game =
        await createGame(
          user,
          username.trim()
        )

      window.location.href =
        `/chess/id/${game.id}`
    } catch (error) {
      console.error(
        'Failed to create game:',
        error
      )

      if (
        error.code ===
          'ACTIVE_GAME_EXISTS' &&
        error.game
      ) {
        window.location.href =
          `/chess/id/${error.game.id}`

        return
      }

      setGameError(
        'Could not create the game. Please try again.'
      )

      setCreatingGame(false)
    }
  }

  function handleCodeChange(
    value
  ) {
    const cleaned =
      value
        .replace(
          /\D/g,
          ''
        )
        .slice(
          0,
          4
        )

    setGameCode(
      cleaned
    )

    if (codeError) {
      setCodeError('')
    }
  }

  async function joinGameById(
    targetGameId
  ) {
    if (
      !prepareUsername()
    ) {
      return
    }

    setCodeError('')
    setGameError('')
    setJoiningGameId(
      targetGameId
    )

    try {
      await ensureAnonymousUser()

      await joinDatabaseGame(
        targetGameId,
        username.trim()
      )

      window.location.href =
        `/chess/id/${targetGameId}`
    } catch (error) {
      console.error(
        'Failed to join game:',
        error
      )

      const message =
        error.message || ''

      if (
        message.includes(
          'Game not found'
        )
      ) {
        setCodeError(
          'Game not found.'
        )
      } else if (
        message.includes(
          'already have an active game'
        )
      ) {
        setCodeError(
          'You already have another active game.'
        )
      } else if (
        message.includes(
          'not joinable'
        ) ||
        message.includes(
          'Game is full'
        )
      ) {
        setCodeError(
          'This game can no longer be joined.'
        )
      } else {
        setCodeError(
          'Could not join this game.'
        )
      }

      setJoiningGameId(
        null
      )
    }
  }

  async function handleJoinGame() {
    if (
      !/^\d{4}$/.test(
        gameCode
      )
    ) {
      setCodeError(
        'Enter a 4-digit game code.'
      )

      return
    }

    await joinGameById(
      gameCode
    )
  }

  function handleCodeKeyDown(
    event
  ) {
    if (
      event.key ===
      'Enter'
    ) {
      handleJoinGame()
    }
  }

  function openGame(
    targetGameId
  ) {
    window.location.href =
      `/chess/id/${targetGameId}`
  }

  function getFinishedResult(
    game
  ) {
    if (
      game.result ===
      'checkmate'
    ) {
      if (
        game.winner ===
        'white'
      ) {
        return 'White won by checkmate'
      }

      if (
        game.winner ===
        'black'
      ) {
        return 'Black won by checkmate'
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
        return 'White won by resignation'
      }

      if (
        game.winner ===
        'black'
      ) {
        return 'Black won by resignation'
      }
    }

    if (
      game.result ===
      'stalemate'
    ) {
      return 'Draw by stalemate'
    }

    if (
      game.result ===
      'threefold_repetition'
    ) {
      return 'Draw by repetition'
    }

    if (
      game.result ===
      'insufficient_material'
    ) {
      return 'Draw by insufficient material'
    }

    if (
      game.result ===
      'fifty_move_rule'
    ) {
      return 'Draw by fifty-move rule'
    }

    if (
      game.result ===
      'draw'
    ) {
      return 'Draw'
    }

    if (
      game.result ===
      'cancelled'
    ) {
      return 'Cancelled'
    }

    if (
      game.winner ===
      'white'
    ) {
      return 'White won'
    }

    if (
      game.winner ===
      'black'
    ) {
      return 'Black won'
    }

    if (
      game.winner ===
      'draw'
    ) {
      return 'Draw'
    }

    return 'Finished'
  }

  const waitingGames =
    games.filter(
      (game) =>
        game.status ===
        'waiting'
    )

  const playingGames =
    games.filter(
      (game) =>
        game.status ===
        'playing'
    )

  /*
   * Keep the history reasonably
   * small for now.
   *
   * getGames() returns newest first,
   * so this gives us the latest
   * 20 completed games.
   */
  const finishedGames =
    games
      .filter(
        (game) =>
          game.status ===
          'finished'
      )
      .slice(
        0,
        20
      )

  const activeGameCount =
    waitingGames.length +
    playingGames.length

  function renderActiveGameCard(
    game
  ) {
    const isWaiting =
      game.status ===
      'waiting'

    return (
      <div
        className="game-list-card"
        key={game.id}
      >

        <div className="game-list-main">

          <div className="game-list-code">
            #{game.id}
          </div>

          <div className="game-list-players">

            <div>
              <span>
                ♔
              </span>

              <strong>
                {game.white_name ||
                  'Waiting...'}
              </strong>

              <small>
                White
              </small>
            </div>

            <span className="game-list-vs">
              VS
            </span>

            <div>
              <span>
                ♚
              </span>

              <strong>
                {game.black_name ||
                  'Waiting...'}
              </strong>

              <small>
                Black
              </small>
            </div>

          </div>

        </div>

        <div className="game-list-actions">

          <span
            className={
              `game-status-badge ${
                isWaiting
                  ? 'waiting'
                  : 'playing'
              }`
            }
          >
            {isWaiting
              ? 'Waiting'
              : 'Playing'}
          </span>

          {isWaiting ? (
            <button
              type="button"
              className="join-game-button"
              onClick={() =>
                joinGameById(
                  game.id
                )
              }
              disabled={
                joiningGameId ===
                game.id
              }
            >
              {joiningGameId ===
              game.id
                ? 'Joining...'
                : 'Join'}
            </button>
          ) : (
            <button
              type="button"
              className="join-game-button"
              onClick={() =>
                openGame(
                  game.id
                )
              }
            >
              Spectate
            </button>
          )}

        </div>

      </div>
    )
  }

  function renderFinishedGameCard(
    game
  ) {
    return (
      <div
        className="game-list-card finished-game-card"
        key={game.id}
      >

        <div className="game-list-main">

          <div className="game-list-code">
            #{game.id}
          </div>

          <div className="game-list-players">

            <div>
              <span>
                ♔
              </span>

              <strong>
                {game.white_name ||
                  'Unknown'}
              </strong>

              <small>
                White
              </small>
            </div>

            <span className="game-list-vs">
              VS
            </span>

            <div>
              <span>
                ♚
              </span>

              <strong>
                {game.black_name ||
                  'Unknown'}
              </strong>

              <small>
                Black
              </small>
            </div>

          </div>

        </div>

        <div className="game-list-actions">

          <span className="finished-result">
            {getFinishedResult(
              game
            )}
          </span>

          <button
            type="button"
            className="join-game-button"
            onClick={() =>
              openGame(
                game.id
              )
            }
          >
            View
          </button>

        </div>

      </div>
    )
  }

  return (
    <div className="lobby">

      <div className="lobby-hero">

        <div className="lobby-piece">
          ♞
        </div>

        <h1>
          Ferretusz Chess
        </h1>

        <p>
          Create a game, join one
          with a code, or spectate
          a live match.
        </p>

      </div>

      <div className="lobby-card">

        <UsernameInput
          username={
            username
          }
          onChange={
            handleUsernameChange
          }
          error={
            usernameError
          }
        />

        <button
          type="button"
          className="create-game-button"
          onClick={
            handleCreateGame
          }
          disabled={
            creatingGame
          }
        >
          {creatingGame
            ? 'Creating...'
            : 'Create Game'}
        </button>

        {gameError && (
          <p className="input-error">
            {gameError}
          </p>
        )}

        <div className="lobby-divider">
          <span>
            OR
          </span>
        </div>

        <div className="join-section">

          <label htmlFor="game-code">
            Game code
          </label>

          <div className="join-row">

            <input
              id="game-code"
              className="game-code-input"
              type="text"
              inputMode="numeric"
              value={
                gameCode
              }
              maxLength={
                4
              }
              placeholder="4821"
              onChange={
                (event) =>
                  handleCodeChange(
                    event.target.value
                  )
              }
              onKeyDown={
                handleCodeKeyDown
              }
            />

            <button
              type="button"
              className="join-game-button"
              onClick={
                handleJoinGame
              }
              disabled={
                joiningGameId ===
                  gameCode &&
                gameCode.length ===
                  4
              }
            >
              {joiningGameId ===
                gameCode &&
              gameCode.length ===
                4
                ? 'Joining...'
                : 'Join'}
            </button>

          </div>

          {codeError && (
            <p className="input-error">
              {codeError}
            </p>
          )}

        </div>

      </div>

      <section className="games-section">

        <div className="games-heading">

          <h2>
            Current Games
          </h2>

          <span className="game-count">
            {activeGameCount}{' '}
            {activeGameCount === 1
              ? 'game'
              : 'games'}
          </span>

        </div>

        {loadingGames && (
          <div className="empty-games">
            <span>♟</span>
            <p>Loading games...</p>
          </div>
        )}

        {!loadingGames &&
          gamesError && (
            <div className="empty-games">
              <span>♟</span>
              <p>
                {gamesError}
              </p>
            </div>
          )}

        {!loadingGames &&
          !gamesError &&
          activeGameCount ===
            0 && (
            <div className="empty-games">

              <span>♟</span>

              <p>
                No active games.
              </p>

              <small>
                Create a game to
                get started.
              </small>

            </div>
          )}

        {!loadingGames &&
          !gamesError &&
          activeGameCount >
            0 && (
            <div className="games-list">

              {waitingGames.length >
                0 && (
                <div className="game-list-group">

                  <h3>
                    Waiting
                  </h3>

                  {waitingGames.map(
                    renderActiveGameCard
                  )}

                </div>
              )}

              {playingGames.length >
                0 && (
                <div className="game-list-group">

                  <h3>
                    Live Games
                  </h3>

                  {playingGames.map(
                    renderActiveGameCard
                  )}

                </div>
              )}

            </div>
          )}

      </section>

      {!loadingGames &&
        !gamesError &&
        finishedGames.length >
          0 && (
          <section className="games-section finished-games-section">

            <div className="games-heading">

              <h2>
                Finished Games
              </h2>

              <span className="game-count">
                Latest{' '}
                {
                  finishedGames.length
                }
              </span>

            </div>

            <div className="games-list">

              <div className="game-list-group">

                {finishedGames.map(
                  renderFinishedGameCard
                )}

              </div>

            </div>

          </section>
        )}

    </div>
  )
}

export default Lobby