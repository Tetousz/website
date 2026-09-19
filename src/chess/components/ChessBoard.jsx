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

function ChessBoard({
  playerColor = 'w',
}) {
  const [game, setGame] = useState(() => new Chess())
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [legalSquares, setLegalSquares] = useState([])
  const [lastMove, setLastMove] = useState(null)
  const [pendingPromotion, setPendingPromotion] = useState(null)

  function getSquare(row, col) {
    if (playerColor === 'b') {
        return `${FILES[7 - col]}${row + 1}`
    }

    return `${FILES[col]}${8 - row}`
    }
  function finishMove(from, to, promotion = undefined) {
    try {
      const newGame = new Chess(game.fen())

      const move = newGame.move({
        from,
        to,
        ...(promotion ? { promotion } : {}),
      })

      if (!move) return

      setGame(newGame)

      setLastMove({
        from: move.from,
        to: move.to,
      })

      setSelectedSquare(null)
      setLegalSquares([])
      setPendingPromotion(null)
    } catch {
      setSelectedSquare(null)
      setLegalSquares([])
      setPendingPromotion(null)
    }
  }

  function choosePromotion(piece) {
    if (!pendingPromotion) return

    finishMove(
      pendingPromotion.from,
      pendingPromotion.to,
      piece
    )
  }

  function selectSquare(square) {
    // Don't allow board interaction while choosing promotion
    if (pendingPromotion) return

    const piece = game.get(square)

    // Nothing selected yet
    if (!selectedSquare) {
      if (!piece) return

      // Only select pieces belonging to the current player
      if (piece.color !== game.turn()) return

      const moves = game.moves({
        square,
        verbose: true,
      })

      setSelectedSquare(square)
      setLegalSquares(moves.map((move) => move.to))

      return
    }

    // Clicking selected square again deselects it
    if (square === selectedSquare) {
      setSelectedSquare(null)
      setLegalSquares([])
      return
    }

    // Select another friendly piece
    if (piece && piece.color === game.turn()) {
      const moves = game.moves({
        square,
        verbose: true,
      })

      setSelectedSquare(square)
      setLegalSquares(moves.map((move) => move.to))

      return
    }

    // Check whether this is a pawn promotion
    const selectedPiece = game.get(selectedSquare)
    const targetRank = square[1]

    const isPromotion =
      selectedPiece?.type === 'p' &&
      (
        (selectedPiece.color === 'w' && targetRank === '8') ||
        (selectedPiece.color === 'b' && targetRank === '1')
      )

    if (isPromotion) {
      setPendingPromotion({
        from: selectedSquare,
        to: square,
        color: selectedPiece.color,
      })

      return
    }

    finishMove(selectedSquare, square)
  }

  // THIS is the restart/reset function I was referring to
  function restartGame() {
    setGame(new Chess())
    setSelectedSquare(null)
    setLegalSquares([])
    setLastMove(null)

    // Reset/cancel any pending promotion
    setPendingPromotion(null)
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
  const displayBoard =
  playerColor === 'b'
    ? board
        .slice()
        .reverse()
        .map((row) =>
          row.slice().reverse()
        )
    : board

  return (
    <div className="game-container">

      {/* PROMOTION WINDOW */}
      {pendingPromotion && (
        <div className="promotion-overlay">
          <div className="promotion-dialog">

            <h2>Choose promotion</h2>

            <div className="promotion-options">

              <button onClick={() => choosePromotion('q')}>
                {pendingPromotion.color === 'w' ? '♕' : '♛'}
                <span>Queen</span>
              </button>

              <button onClick={() => choosePromotion('r')}>
                {pendingPromotion.color === 'w' ? '♖' : '♜'}
                <span>Rook</span>
              </button>

              <button onClick={() => choosePromotion('b')}>
                {pendingPromotion.color === 'w' ? '♗' : '♝'}
                <span>Bishop</span>
              </button>

              <button onClick={() => choosePromotion('n')}>
                {pendingPromotion.color === 'w' ? '♘' : '♞'}
                <span>Knight</span>
              </button>

            </div>
          </div>
        </div>
      )}

      {/* GAME STATUS */}
      <div className="game-status">
        {getStatus()}
      </div>

      {/* BOARD */}
      <div className="chess-board">
        {displayBoard.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const square = getSquare(rowIndex, colIndex)

            const isLight =
              (rowIndex + colIndex) % 2 === 0

            const isSelected =
              selectedSquare === square

            const isLegal =
              legalSquares.includes(square)

            const isLastMove =
              lastMove &&
              (
                lastMove.from === square ||
                lastMove.to === square
              )

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
                        {playerColor === 'b'
                        ? rowIndex + 1
                        : 8 - rowIndex}
                    </span>
                )}

                    {rowIndex === 7 && (
                    <span className="file-label">
                        {playerColor === 'b'
                        ? FILES[7 - colIndex]
                        : FILES[colIndex]}
                    </span>
                )}

              </button>
            )
          })
        )}
      </div>

      {/* CONTROLS */}
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