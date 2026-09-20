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

function createGameFromMoves(
  moves,
  expectedFen = null
) {
  const chess =
    new Chess()

  const moveHistory =
    Array.isArray(moves)
      ? moves
      : []

  for (
    const move of moveHistory
  ) {
    const moveData = {
      from:
        move.from,

      to:
        move.to,
    }

    if (
      move.promotion
    ) {
      moveData.promotion =
        move.promotion
    }

    const result =
      chess.move(
        moveData
      )

    if (!result) {
      throw new Error(
        'Stored move history contains an invalid move.'
      )
    }
  }

  if (
    expectedFen &&
    chess.fen() !==
      expectedFen
  ) {
    throw new Error(
      'Stored move history does not match the current position.'
    )
  }

  return chess
}

function ChessBoard({
  gameId,
  playerColor = null,
  fen,
  moves = [],
  reviewPly = null,
  gameStatus = 'playing',
  winner = null,
  result = null,
  onGameUpdate,
}) {
  const [
    game,
    setGame,
  ] = useState(() => {
    try {
      return createGameFromMoves(
        moves,
        fen
      )
    } catch (error) {
      console.error(
        'Could not reconstruct game:',
        error
      )

      return new Chess(
        fen
      )
    }
  })

  const [
    selectedSquare,
    setSelectedSquare,
  ] = useState(null)

  const [
    legalSquares,
    setLegalSquares,
  ] = useState([])

  const [
    lastMove,
    setLastMove,
  ] = useState(null)

  const [
    pendingPromotion,
    setPendingPromotion,
  ] = useState(null)

  const [
    submittingMove,
    setSubmittingMove,
  ] = useState(false)

  const [
    moveError,
    setMoveError,
  ] = useState('')

  useEffect(() => {
    if (!fen) {
      return
    }

    try {
      const allMoves =
        Array.isArray(moves)
          ? moves
          : []

      const isReviewing =
        reviewPly !== null

      const visibleMoves =
        isReviewing
          ? allMoves.slice(
              0,
              Math.max(
                0,
                Math.min(
                  reviewPly,
                  allMoves.length
                )
              )
            )
          : allMoves

      const newGame =
        createGameFromMoves(
          visibleMoves,
          isReviewing
            ? null
            : fen
        )

      setGame(
        newGame
      )

      setSelectedSquare(
        null
      )

      setLegalSquares(
        []
      )

      setPendingPromotion(
        null
      )

      if (
        visibleMoves.length > 0
      ) {
        const latestMove =
          visibleMoves[
            visibleMoves.length - 1
          ]

        setLastMove({
          from:
            latestMove.from,

          to:
            latestMove.to,
        })
      } else {
        setLastMove(
          null
        )
      }
    } catch (error) {
      console.error(
        'Could not reconstruct game state:',
        error
      )

      /*
       * Only use the authoritative FEN fallback while LIVE.
       * A historical position must come from its move history.
       */
      if (reviewPly === null) {
        try {
          setGame(
            new Chess(
              fen
            )
          )
        } catch (
          fenError
        ) {
          console.error(
            'Invalid FEN:',
            fenError
          )
        }
      }
    }
  }, [
    fen,
    moves,
    reviewPly,
  ])

  function getSquare(
    row,
    col
  ) {
    if (
      playerColor === 'b'
    ) {
      return `${
        FILES[7 - col]
      }${row + 1}`
    }

    return `${
      FILES[col]
    }${8 - row}`
  }

  async function finishMove(
    from,
    to,
    promotion = undefined
  ) {
    if (
      submittingMove
    ) {
      return
    }

    if (
      reviewPly !== null
    ) {
      return
    }

    if (
      gameStatus !==
      'playing'
    ) {
      return
    }

    if (
      playerColor !== 'w' &&
      playerColor !== 'b'
    ) {
      return
    }

    if (
      game.turn() !==
      playerColor
    ) {
      return
    }

    /*
     * The browser still checks the move
     * locally for a responsive UI.
     *
     * This is NOT the security check.
     * The Edge Function independently
     * validates the same move.
     */
    const previewGame =
      new Chess(
        game.fen()
      )

    let previewMove

    try {
      previewMove =
        previewGame.move({
          from,
          to,

          ...(promotion
            ? {
                promotion,
              }
            : {}),
        })
    } catch {
      return
    }

    if (!previewMove) {
      return
    }

    try {
      setSubmittingMove(
        true
      )

      setMoveError('')

      /*
       * Optimistic update:
       *
       * The move has already been checked locally above,
       * so show it immediately instead of waiting for the
       * Edge Function + database round trip.
       *
       * This is only a visual/client-side preview. The
       * server remains authoritative and independently
       * validates the move.
       */
      setGame(
        previewGame
      )

      setLastMove({
        from:
          previewMove.from,

        to:
          previewMove.to,
      })

      setSelectedSquare(
        null
      )

      setLegalSquares(
        []
      )

      setPendingPromotion(
        null
      )

      /*
       * IMPORTANT:
       *
       * We no longer send:
       *
       * - FEN
       * - PGN
       * - move history
       * - whose turn is next
       * - winner
       * - result
       *
       * The server calculates all of
       * those values itself.
       */
      const updatedGame =
        await submitMove({
          gameId,

          from,

          to,

          promotion:
            promotion ||
            null,
        })

      const updatedChess =
        createGameFromMoves(
          updatedGame.moves,
          updatedGame.fen
        )

      setGame(
        updatedChess
      )

      const updatedMoves =
        Array.isArray(
          updatedGame.moves
        )
          ? updatedGame.moves
          : []

      if (
        updatedMoves.length >
        0
      ) {
        const latestMove =
          updatedMoves[
            updatedMoves.length -
            1
          ]

        setLastMove({
          from:
            latestMove.from,

          to:
            latestMove.to,
        })
      }

      setSelectedSquare(
        null
      )

      setLegalSquares(
        []
      )

      setPendingPromotion(
        null
      )

      if (
        onGameUpdate
      ) {
        onGameUpdate(
          updatedGame
        )
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
       * Restore the authoritative
       * state supplied through props.
       */
      try {
        setGame(
          createGameFromMoves(
            moves,
            fen
          )
        )
      } catch {
        try {
          setGame(
            new Chess(
              fen
            )
          )
        } catch {
          // Ignore invalid fallback.
        }
      }

      setSelectedSquare(
        null
      )

      setLegalSquares(
        []
      )

      setPendingPromotion(
        null
      )
    } finally {
      setSubmittingMove(
        false
      )
    }
  }

  function choosePromotion(
    piece
  ) {
    if (
      !pendingPromotion
    ) {
      return
    }

    finishMove(
      pendingPromotion.from,
      pendingPromotion.to,
      piece
    )
  }

  function selectSquare(
    square
  ) {
    if (
      submittingMove
    ) {
      return
    }

    if (
      reviewPly !== null
    ) {
      return
    }

    if (
      gameStatus !==
      'playing'
    ) {
      return
    }

    if (
      pendingPromotion
    ) {
      return
    }

    if (
      playerColor !== 'w' &&
      playerColor !== 'b'
    ) {
      return
    }

    if (
      game.turn() !==
      playerColor
    ) {
      return
    }

    const piece =
      game.get(
        square
      )

    if (
      !selectedSquare
    ) {
      if (!piece) {
        return
      }

      if (
        piece.color !==
        playerColor
      ) {
        return
      }

      const availableMoves =
        game.moves({
          square,
          verbose: true,
        })

      setSelectedSquare(
        square
      )

      setLegalSquares(
        availableMoves.map(
          (availableMove) =>
            availableMove.to
        )
      )

      return
    }

    if (
      square ===
      selectedSquare
    ) {
      setSelectedSquare(
        null
      )

      setLegalSquares(
        []
      )

      return
    }

    if (
      piece &&
      piece.color ===
        playerColor
    ) {
      const availableMoves =
        game.moves({
          square,
          verbose: true,
        })

      setSelectedSquare(
        square
      )

      setLegalSquares(
        availableMoves.map(
          (availableMove) =>
            availableMove.to
        )
      )

      return
    }

    if (
      !legalSquares.includes(
        square
      )
    ) {
      setSelectedSquare(
        null
      )

      setLegalSquares(
        []
      )

      return
    }

    const selectedPiece =
      game.get(
        selectedSquare
      )

    const targetRank =
      square[1]

    const isPromotion =
      selectedPiece?.type ===
        'p' &&
      (
        (
          selectedPiece.color ===
            'w' &&
          targetRank ===
            '8'
        ) ||
        (
          selectedPiece.color ===
            'b' &&
          targetRank ===
            '1'
        )
      )

    if (
      isPromotion
    ) {
      setPendingPromotion({
        from:
          selectedSquare,

        to:
          square,

        color:
          selectedPiece.color,
      })

      return
    }

    finishMove(
      selectedSquare,
      square
    )
  }

  function getFinishedStatus() {
    if (
      result ===
      'checkmate'
    ) {
      if (
        winner ===
        'white'
      ) {
        return (
          'Checkmate — White wins!'
        )
      }

      if (
        winner ===
        'black'
      ) {
        return (
          'Checkmate — Black wins!'
        )
      }
    }

    if (
      result ===
      'resignation'
    ) {
      if (
        winner ===
        'white'
      ) {
        return (
          'White wins by resignation'
        )
      }

      if (
        winner ===
        'black'
      ) {
        return (
          'Black wins by resignation'
        )
      }
    }

    if (
      result ===
      'timeout'
    ) {
      if (
        winner ===
        'white'
      ) {
        return (
          'White wins on time'
        )
      }

      if (
        winner ===
        'black'
      ) {
        return (
          'Black wins on time'
        )
      }
    }

    if (
      result ===
      'stalemate'
    ) {
      return (
        'Draw — Stalemate'
      )
    }

    if (
      result ===
      'threefold_repetition'
    ) {
      return (
        'Draw — Threefold repetition'
      )
    }

    if (
      result ===
      'insufficient_material'
    ) {
      return (
        'Draw — Insufficient material'
      )
    }

    if (
      result ===
      'fifty_move_rule'
    ) {
      return (
        'Draw — Fifty-move rule'
      )
    }

    if (
      result ===
      'draw'
    ) {
      return 'Draw'
    }

    if (
      result ===
      'cancelled'
    ) {
      return (
        'Game cancelled'
      )
    }

    return (
      'Game finished'
    )
  }

  function getStatus() {
    if (
      reviewPly !== null
    ) {
      const totalMoves =
        Array.isArray(moves)
          ? moves.length
          : 0

      if (reviewPly === 0) {
        return (
          `Reviewing starting position — ${totalMoves} moves total`
        )
      }

      return (
        `Reviewing move ${reviewPly} / ${totalMoves} — ← → to navigate`
      )
    }

    if (
      gameStatus ===
      'finished'
    ) {
      return (
        getFinishedStatus()
      )
    }

    const player =
      game.turn() === 'w'
        ? 'White'
        : 'Black'

    if (
      game.inCheck()
    ) {
      if (
        game.turn() ===
        playerColor
      ) {
        return (
          `${player} to move — CHECK! — Your turn`
        )
      }

      return (
        `${player} to move — CHECK!`
      )
    }

    if (
      playerColor === 'w' ||
      playerColor === 'b'
    ) {
      if (
        game.turn() ===
        playerColor
      ) {
        return (
          `${player} to move — Your turn`
        )
      }

      return (
        `${player} to move — Opponent's turn`
      )
    }

    return (
      `${player} to move`
    )
  }

  const board =
    game.board()

  const displayBoard =
    playerColor === 'b'
      ? board
          .slice()
          .reverse()
          .map(
            (row) =>
              row
                .slice()
                .reverse()
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
                  choosePromotion(
                    'q'
                  )
                }
                disabled={
                  submittingMove
                }
              >
                {pendingPromotion.color ===
                'w'
                  ? '♕'
                  : '♛'}

                <span>
                  Queen
                </span>
              </button>

              <button
                onClick={() =>
                  choosePromotion(
                    'r'
                  )
                }
                disabled={
                  submittingMove
                }
              >
                {pendingPromotion.color ===
                'w'
                  ? '♖'
                  : '♜'}

                <span>
                  Rook
                </span>
              </button>

              <button
                onClick={() =>
                  choosePromotion(
                    'b'
                  )
                }
                disabled={
                  submittingMove
                }
              >
                {pendingPromotion.color ===
                'w'
                  ? '♗'
                  : '♝'}

                <span>
                  Bishop
                </span>
              </button>

              <button
                onClick={() =>
                  choosePromotion(
                    'n'
                  )
                }
                disabled={
                  submittingMove
                }
              >
                {pendingPromotion.color ===
                'w'
                  ? '♘'
                  : '♞'}

                <span>
                  Knight
                </span>
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
          (
            row,
            rowIndex
          ) =>
            row.map(
              (
                piece,
                colIndex
              ) => {
                const square =
                  getSquare(
                    rowIndex,
                    colIndex
                  )

                const isLight =
                  (
                    rowIndex +
                    colIndex
                  ) %
                    2 ===
                  0

                const isSelected =
                  selectedSquare ===
                  square

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
                    key={
                      square
                    }
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
                    ].join(
                      ' '
                    )}
                    onClick={() =>
                      selectSquare(
                        square
                      )
                    }
                    disabled={
                      submittingMove ||
                      reviewPly !== null
                    }
                    aria-label={
                      square
                    }
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
                        {
                          pieceSymbol
                        }
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

                    {colIndex ===
                      0 && (
                      <span className="rank-label">
                        {
                          playerColor ===
                          'b'
                            ? rowIndex +
                              1
                            : 8 -
                              rowIndex
                        }
                      </span>
                    )}

                    {rowIndex ===
                      7 && (
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