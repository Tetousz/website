import { useState } from 'react'
import UsernameInput from './UsernameInput'
import {
  getUsername,
  saveUsername,
  validateUsername,
} from '../lib/identity'

function Lobby() {
  const [username, setUsername] = useState(() => getUsername())
  const [usernameError, setUsernameError] = useState('')
  const [gameCode, setGameCode] = useState('')
  const [codeError, setCodeError] = useState('')

  function prepareUsername() {
    const error = validateUsername(username)

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
  }

  function createGame() {
    if (!prepareUsername()) return

    /*
      TEMPORARY PHASE 3 BEHAVIOR

      We don't have Supabase yet, so this does NOT
      create a real online room.

      Phase 5 will replace this with database room creation.
    */

    const code = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')

    window.location.href = `/chess/id/${code}`
  }

  function handleCodeChange(value) {
    // Remove everything except numbers
    const cleaned = value
      .replace(/\D/g, '')
      .slice(0, 4)

    setGameCode(cleaned)

    if (codeError) {
      setCodeError('')
    }
  }

  function joinGame() {
    if (!prepareUsername()) return

    if (!/^\d{4}$/.test(gameCode)) {
      setCodeError('Enter a 4-digit game code.')
      return
    }

    setCodeError('')

    /*
      TEMPORARY PHASE 3 BEHAVIOR

      Phase 5 will first check whether the room
      actually exists.
    */

    window.location.href = `/chess/id/${gameCode}`
  }

  function handleCodeKeyDown(event) {
    if (event.key === 'Enter') {
      joinGame()
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
          className="create-game-button"
          onClick={createGame}
        >
          Create Game
        </button>

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
                handleCodeChange(event.target.value)
              }
              onKeyDown={handleCodeKeyDown}
            />

            <button
              className="join-game-button"
              onClick={joinGame}
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