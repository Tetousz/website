import {
  useEffect,
  useState,
} from 'react'

import { Chess } from 'chess.js'
import { submitMove } from '../lib/games'

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

const FILES = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
]

function ChessBoard({
  gameId,
  playerColor = null,
  fen,
  onGameUpdate,
}) {
  const [game, setGame] = useState(
    () => new Chess(fen)
  )

  const [selectedSquare, setSelectedSquare] =
    useState(null)

  const [legalSquares, setLegalSquares] =
    useState([])

  const [lastMove, setLastMove] =
    useState(null)

  const [
    pendingPromotion,
    setPendingPromotion,
  ] = useState(null)

  const [submittingMove, setSubmittingMove] =
    useState(false)

  const [moveError, setMoveError] =
    useState('')

  useEffect(() => {
    if (!fen) {
      return
    }

    try {
      const newGame = new Chess(fen)

      setGame(newGame)
      setSelectedSquare(null)
      setLegalSquares([])
      setPendingPromotion(null)
    } catch (error) {
      console.error(
        'Invalid game FEN:',
        error
      )
    }
  }, [fen])

  function getSquare(row, col) {
    if (playerColor === 'b') {
      return `${FILES[7 - col]}${row + 1}`
    }

    return `${FILES[col]}${8 - row}`
  }

  async function finishMove(
    from,
    to,
    promotion = undefined
  ) {
    if (submittingMove) {
      return
    }

    /*
     * Spectators cannot make moves.
     */
    if (
      playerColor !== 'w' &&
      playerColor !== 'b'
    ) {
      return
    }

    /*
     * The local board also prevents you from
     * attempting to move when it isn't your turn.
     *
     * The database performs the authoritative
     * ownership/turn check as well.
     */
    if (game.turn() !== playerColor) {
      return
    }

    const expectedFen = game.fen()

    try {
      const newGame = new Chess(expectedFen)

      const move = newGame.move({
        from,
        to,
        ...(promotion
          ? { promotion }
          : {}),
      })

      if (!move) {
        return
      }

      setSubmittingMove(true)
      setMoveError('')

      const updatedGame =
        await submitMove({
          gameId,
          expectedFen,
          newFen: newGame.fen(),
          newPgn: newGame.pgn(),
          newTurn: newGame.turn(),
        })

      /*
       * Only update the visible board after
       * Supabase accepts the move.
       */
      setGame(
        new Chess(updatedGame.fen)
      )

      setLastMove({
        from: move.from,
        to: move.to,
      })

      setSelectedSquare(null)
      setLegalSquares([])
      setPendingPromotion(null)

      /*
       * Update GamePage's database game object.
       */
      if (onGameUpdate) {
        onGameUpdate(updatedGame)
      }
    } catch (error) {
      console.error(
        'Failed to submit move:',
        error
      )

      setMoveError(
        error.message ||
        'Could not submit move.'
      )

      /*
       * Restore the authoritative position
       * supplied by GamePage.
       */
      try {
        setGame(new Chess(fen))
      } catch {
        // Ignore invalid fallback FEN.
      }

      setSelectedSquare(null)
      setLegalSquares([])
      setPendingPromotion(null)
    } finally {
      setSubmittingMove(false)
    }
  }

  function choosePromotion(piece) {
    if (!pendingPromotion) {
      return
    }

    finishMove(
      pendingPromotion.from,
      pendingPromotion.to,
      piece
    )
  }

  function selectSquare(square) {
    if (submittingMove) {
      return
    }

    if (pendingPromotion) {
      return
    }

    /*
     * Spectators cannot interact with the board.
     */
    if (
      playerColor !== 'w' &&
      playerColor !== 'b'
    ) {
      return
    }

    /*
     * A player can only interact when it is
     * their turn.
     */
    if (game.turn() !== playerColor) {
      return
    }

    const piece = game.get(square)

    /*
     * Nothing selected yet.
     */
    if (!selectedSquare) {
      if (!piece) {
        return
      }

      /*
       * Only your own pieces can be selected.
       */
      if (piece.color !== playerColor) {
        return
      }

      const moves = game.moves({
        square,
        verbose: true,
      })

      setSelectedSquare(square)

      setLegalSquares(
        moves.map((move) => move.to)
      )

      return
    }

    /*
     * Clicking the selected square again
     * deselects it.
     */
    if (square === selectedSquare) {
      setSelectedSquare(null)
      setLegalSquares([])
      return
    }

    /*
     * Switch selection to another one of
     * your pieces.
     */
    if (
      piece &&
      piece.color === playerColor
    ) {
      const moves = game.moves({
        square,
        verbose: true,
      })

      setSelectedSquare(square)

      setLegalSquares(
        moves.map((move) => move.to)
      )

      return
    }

    /*
     * Don't attempt a move unless chess.js
     * marked the destination as legal.
     */
    if (!legalSquares.includes(square)) {
      setSelectedSquare(null)
      setLegalSquares([])
      return
    }

    const selectedPiece =
      game.get(selectedSquare)

    const targetRank = square[1]

    const isPromotion =
      selectedPiece?.type === 'p' &&
      (
        (
          selectedPiece.color === 'w' &&
          targetRank === '8'
        ) ||
        (
          selectedPiece.color === 'b' &&
          targetRank === '1'
        )
      )

    if (isPromotion) {
      setPendingPromotion({
        from: selectedSquare,
        to: square,
        color: selectedPiece.color,
      })

      return
    }

    finishMove(
      selectedSquare,
      square
    )
  }

  function getStatus() {
    if (submittingMove) {
      return 'Submitting move...'
    }

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

    const player =
      game.turn() === 'w'
        ? 'White'
        : 'Black'

    if (game.inCheck()) {
      return `${player} to move — CHECK!`
    }

    if (
      playerColor === 'w' ||
      playerColor === 'b'
    ) {
      if (game.turn() === playerColor) {
        return `${player} to move — Your turn`
      }

      return `${player} to move — Opponent's turn`
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

      {pendingPromotion && (
        <div className="promotion-overlay">

          <div className="promotion-dialog">

            <h2>
              Choose promotion
            </h2>

            <div className="promotion-options">

              <button
                onClick={() =>
                  choosePromotion('q')
                }
                disabled={submittingMove}
              >
                {pendingPromotion.color === 'w'
                  ? '♕'
                  : '♛'}

                <span>Queen</span>
              </button>

              <button
                onClick={() =>
                  choosePromotion('r')
                }
                disabled={submittingMove}
              >
                {pendingPromotion.color === 'w'
                  ? '♖'
                  : '♜'}

                <span>Rook</span>
              </button>

              <button
                onClick={() =>
                  choosePromotion('b')
                }
                disabled={submittingMove}
              >
                {pendingPromotion.color === 'w'
                  ? '♗'
                  : '♝'}

                <span>Bishop</span>
              </button>

              <button
                onClick={() =>
                  choosePromotion('n')
                }
                disabled={submittingMove}
              >
                {pendingPromotion.color === 'w'
                  ? '♘'
                  : '♞'}

                <span>Knight</span>
              </button>

            </div>

          </div>

        </div>
      )}

      <div className="game-status">
        {getStatus()}
      </div>

      {moveError && (
        <div className="game-warning">
          {moveError}
        </div>
      )}

      <div className="chess-board">

        {displayBoard.map(
          (row, rowIndex) =>
            row.map(
              (piece, colIndex) => {

                const square =
                  getSquare(
                    rowIndex,
                    colIndex
                  )

                const isLight =
                  (
                    rowIndex +
                    colIndex
                  ) % 2 === 0

                const isSelected =
                  selectedSquare === square

                const isLegal =
                  legalSquares.includes(
                    square
                  )

                const isLastMove =
                  lastMove &&
                  (
                    lastMove.from ===
                      square ||
                    lastMove.to ===
                      square
                  )

                const pieceSymbol =
                  piece
                    ? PIECES[
                        `${piece.color}${piece.type}`
                      ]
                    : ''

                return (
                  <button
                    key={square}
                    className={[
                      'chess-square',

                      isLight
                        ? 'light'
                        : 'dark',

                      isSelected
                        ? 'selected'
                        : '',

                      isLegal
                        ? 'legal'
                        : '',

                      isLastMove
                        ? 'last-move'
                        : '',
                    ].join(' ')}
                    onClick={() =>
                      selectSquare(square)
                    }
                    disabled={
                      submittingMove
                    }
                    aria-label={square}
                  >

                    {pieceSymbol && (
                      <span
                        className={
                          `chess-piece ${
                            piece.color ===
                            'w'
                              ? 'white-piece'
                              : 'black-piece'
                          }`
                        }
                      >
                        {pieceSymbol}
                      </span>
                    )}

                    {isLegal &&
                      !piece && (
                        <span
                          className="legal-dot"
                        />
                      )}

                    {isLegal &&
                      piece && (
                        <span
                          className="capture-ring"
                        />
                      )}

                    {colIndex === 0 && (
                      <span className="rank-label">
                        {
                          playerColor ===
                          'b'
                            ? rowIndex + 1
                            : 8 - rowIndex
                        }
                      </span>
                    )}

                    {rowIndex === 7 && (
                      <span className="file-label">
                        {
                          playerColor ===
                          'b'
                            ? FILES[
                                7 -
                                colIndex
                              ]
                            : FILES[
                                colIndex
                              ]
                        }
                      </span>
                    )}

                  </button>
                )
              }
            )
        )}

      </div>

    </div>
  )
}

export default ChessBoard