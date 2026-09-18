import { useState } from 'react'
import { Chess } from 'chess.js'

const PIECES = {
  wp: '♙',
  wn: '♘',
  wb: '♗',
  wr: '♖',
  wq: '♕',
  wk: '♔',

  bp: '♟',
  bn: '♞',
  bb: '♝',
  br: '♜',
  bq: '♛',
  bk: '♚',
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

function ChessBoard() {
  const [game, setGame] = useState(() => new Chess())
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [legalSquares, setLegalSquares] = useState([])
  const [lastMove, setLastMove] = useState(null)

  function getSquare(row, col) {
    return `${FILES[col]}${8 - row}`
  }

  function selectSquare(square) {
    const piece = game.get(square)

    // Nothing selected yet
    if (!selectedSquare) {
      if (!piece) return

      // Only select pieces belonging to the player whose turn it is
      if (piece.color !== game.turn()) return

      const moves = game.moves({
        square,
        verbose: true,
      })

      setSelectedSquare(square)
      setLegalSquares(moves.map((move) => move.to))

      return
    }

    // Clicking the selected square again deselects it
    if (square === selectedSquare) {
      setSelectedSquare(null)
      setLegalSquares([])
      return
    }

    // If another friendly piece is clicked, select that instead
    if (piece && piece.color === game.turn()) {
      const moves = game.moves({
        square,
        verbose: true,
      })

      setSelectedSquare(square)
      setLegalSquares(moves.map((move) => move.to))
      return
    }

    // Try making the move
    try {
      const newGame = new Chess(game.fen())

      const move = newGame.move({
        from: selectedSquare,
        to: square,

        // Temporary Phase 2 behavior:
        // automatically promote pawns to queens.
        promotion: 'q',
      })

      if (!move) return

      setGame(newGame)

      setLastMove({
        from: move.from,
        to: move.to,
      })

      setSelectedSquare(null)
      setLegalSquares([])
    } catch {
      // Illegal move
      setSelectedSquare(null)
      setLegalSquares([])
    }
  }

  function restartGame() {
    setGame(new Chess())
    setSelectedSquare(null)
    setLegalSquares([])
    setLastMove(null)
  }

  function getStatus() {
    if (game.isCheckmate()) {
      return game.turn() === 'w'
        ? 'Checkmate — Black wins!'
        : 'Checkmate — White wins!'
    }

    if (game.isStalemate()) {
      return 'Draw — Stalemate'
    }

    if (game.isThreefoldRepetition()) {
      return 'Draw — Threefold repetition'
    }

    if (game.isInsufficientMaterial()) {
      return 'Draw — Insufficient material'
    }

    if (game.isDrawByFiftyMoves()) {
      return 'Draw — Fifty-move rule'
    }

    if (game.isDraw()) {
      return 'Draw'
    }

    const player = game.turn() === 'w' ? 'White' : 'Black'

    if (game.inCheck()) {
      return `${player} to move — CHECK!`
    }

    return `${player} to move`
  }

  const board = game.board()

  return (
    <div className="game-container">
      <div className="game-status">
        {getStatus()}
      </div>

      <div className="chess-board">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const square = getSquare(rowIndex, colIndex)

            const isLight = (rowIndex + colIndex) % 2 === 0

            const isSelected = selectedSquare === square

            const isLegal = legalSquares.includes(square)

            const isLastMove =
              lastMove &&
              (lastMove.from === square || lastMove.to === square)

            const pieceSymbol = piece
              ? PIECES[`${piece.color}${piece.type}`]
              : ''

            return (
              <button
                key={square}
                className={[
                  'chess-square',
                  isLight ? 'light' : 'dark',
                  isSelected ? 'selected' : '',
                  isLegal ? 'legal' : '',
                  isLastMove ? 'last-move' : '',
                ].join(' ')}
                onClick={() => selectSquare(square)}
                aria-label={square}
              >
                {pieceSymbol && (
                  <span
                    className={`chess-piece ${
                      piece.color === 'w'
                        ? 'white-piece'
                        : 'black-piece'
                    }`}
                  >
                    {pieceSymbol}
                  </span>
                )}

                {isLegal && !piece && (
                  <span className="legal-dot" />
                )}

                {isLegal && piece && (
                  <span className="capture-ring" />
                )}

                {colIndex === 0 && (
                  <span className="rank-label">
                    {8 - rowIndex}
                  </span>
                )}

                {rowIndex === 7 && (
                  <span className="file-label">
                    {FILES[colIndex]}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>

      <div className="game-controls">
        <button
          className="restart-button"
          onClick={restartGame}
        >
          Restart Game
        </button>
      </div>
    </div>
  )
}

export default ChessBoard