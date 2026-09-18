import './ChessApp.css'

import ChessBoard from './components/ChessBoard'
import Lobby from './components/Lobby'
import { getUsername } from './lib/identity'

function ChessApp() {
  const path = window.location.pathname

  const gameMatch = path.match(
    /^\/chess\/id\/(\d{4})\/?$/
  )

  const gameCode = gameMatch
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
          <GamePage gameCode={gameCode} />
        ) : (
          <Lobby />
        )}

      </main>

    </div>
  )
}

function GamePage({ gameCode }) {
  const username = getUsername()

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

      {!username && (
        <div className="game-warning">
          You haven't chosen a username yet.
          Return to the lobby first.
        </div>
      )}

      <ChessBoard />

    </div>
  )
}

export default ChessApp