import { useState } from 'react'

import UsernameInput from './UsernameInput'

import {
  getUsername,
  saveUsername,
  validateUsername,
} from '../lib/identity'

import { ensureAnonymousUser } from '../lib/auth'
import {
  createGame,
  joinGame as joinDatabaseGame,
} from '../lib/games'

function Lobby() {
  const [username, setUsername] =
    useState(() => getUsername())

  const [usernameError, setUsernameError] =
    useState('')

  const [gameCode, setGameCode] =
    useState('')

  const [codeError, setCodeError] =
    useState('')

  const [creatingGame, setCreatingGame] =
    useState(false)

  const [gameError, setGameError] =
    useState('')

  function prepareUsername() {
    const error =
      validateUsername(username)

    if (error) {
      setUsernameError(error)
      return false
    }

    setUsernameError('')
    saveUsername(username)

    return true
  }

  function handleUsernameChange(value) {
    setUsername(value)

    if (usernameError) {
      setUsernameError('')
    }

    if (gameError) {
      setGameError('')
    }
  }

  async function handleCreateGame() {
  if (!prepareUsername()) {
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
      error.code === 'ACTIVE_GAME_EXISTS' &&
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

  function handleCodeChange(value) {
    const cleaned = value
      .replace(/\D/g, '')
      .slice(0, 4)

    setGameCode(cleaned)

    if (codeError) {
      setCodeError('')
    }
  }

async function handleJoinGame() {
  if (!prepareUsername()) {
    return
  }

  if (!/^\d{4}$/.test(gameCode)) {
    setCodeError(
      'Enter a 4-digit game code.'
    )
    return
  }

  setCodeError('')

  try {
    await ensureAnonymousUser()

    await joinDatabaseGame(
      gameCode,
      username.trim()
    )

    window.location.href =
      `/chess/id/${gameCode}`
  } catch (error) {
    console.error(
      'Failed to join game:',
      error
    )

    const message =
      error.message || ''

    if (message.includes('Game not found')) {
      setCodeError('Game not found.')
    } else if (
      message.includes(
        'already have an active game'
      )
    ) {
      setCodeError(
        'You already have another active game.'
      )
    } else if (
      message.includes('not joinable') ||
      message.includes('Game is full')
    ) {
      setCodeError(
        'This game can no longer be joined.'
      )
    } else {
      setCodeError(
        'Could not join this game.'
      )
    }
  }
}

function handleCodeKeyDown(event) {
  if (event.key === 'Enter') {
    handleJoinGame()
  }
}

  return (
    <div className="lobby">

      <div className="lobby-hero">
        <div className="lobby-piece">
          ♞
        </div>

        <h1>Ferretusz Chess</h1>

        <p>
          Create a game or join one with a code.
        </p>
      </div>

      <div className="lobby-card">

        <UsernameInput
          username={username}
          onChange={handleUsernameChange}
          error={usernameError}
        />

        <button
          type="button"
          className="create-game-button"
          onClick={handleCreateGame}
          disabled={creatingGame}
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
          <span>OR</span>
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
              value={gameCode}
              maxLength={4}
              placeholder="4821"
              onChange={(event) =>
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
              onClick={handleJoinGame}
            >
              Join
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
          <h2>Current Games</h2>

          <span className="game-count">
            0 games
          </span>
        </div>

        <div className="empty-games">
          <span>♟</span>

          <p>No active games.</p>

          <small>
            Create a game to get started.
          </small>
        </div>

      </section>

    </div>
  )
}

export default Lobby