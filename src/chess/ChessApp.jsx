import './ChessApp.css'
import ChessBoard from './components/ChessBoard'

function ChessApp() {
  return (
    <div className="chess-app">
      <header className="chess-header">
        <a href="/" className="chess-logo">
          Ferretusz
        </a>

        <span className="chess-title">
          Chess
        </span>
      </header>

      <main className="chess-main">
        <ChessBoard />
      </main>
    </div>
  )
}

export default ChessApp