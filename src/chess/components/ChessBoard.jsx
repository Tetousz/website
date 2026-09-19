import {
  useEffect,
  useState,
} from 'react'

import { Chess } from 'chess.js'
import { submitMove } from '../lib/games'

const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

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

function createGameFromState(
  fen,
  pgn
) {
  /*
   * PGN is preferred because it
   * contains the complete move
   * history.
   *
   * FEN only contains the current
   * board position.
   */
  if (
    pgn &&
    pgn.trim()
  ) {
    try {
      const historyGame =
        new Chess()

      historyGame.loadPgn(
        pgn
      )

      /*
       * Never blindly trust that the
       * PGN and database FEN agree.
       */
      if (
        historyGame.fen() ===
        fen
      ) {
        return historyGame
      }

      console.warn(
        'PGN/FEN mismatch. Falling back to FEN.'
      )
    } catch (error) {
      console.warn(
        'Could not load PGN. Falling back to FEN:',
        error
      )
    }
  }

  /*
   * For a brand-new game, use the
   * normal Chess constructor so the
   * generated PGN starts cleanly.
   */
  if (
    fen === STARTING_FEN
  ) {
    return new Chess()
  }

  return new Chess(
    fen
  )
}

function ChessBoard({
  gameId,
  playerColor = null,
  fen,
  pgn = '',
  gameStatus = 'playing',
  winner = null,
  result = null,
  onGameUpdate,
}) {
  const [
    game,
    setGame,
  ] = useState(
    () =>
      createGameFromState(
        fen,
        pgn
      )
  )

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
      const newGame =
        createGameFromState(
          fen,
          pgn
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
    } catch (error) {
      console.error(
        'Invalid game state:',
        error
      )
    }
  }, [
    fen,
    pgn,
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

  function getGameResult(
    chessGame
  ) {
    if (
      chessGame.isCheckmate()
    ) {
      return {
        finished: true,

        winner:
          chessGame.turn() ===
          'w'
            ? 'black'
            : 'white',

        result:
          'checkmate',
      }
    }

    if (
      chessGame.isStalemate()
    ) {
      return {
        finished: true,
        winner: 'draw',
        result: 'stalemate',
      }
    }

    if (
      chessGame.isThreefoldRepetition()
    ) {
      return {
        finished: true,
        winner: 'draw',
        result:
          'threefold_repetition',
      }
    }

    if (
      chessGame.isInsufficientMaterial()
    ) {
      return {
        finished: true,
        winner: 'draw',
        result:
          'insufficient_material',
      }
    }

    if (
      chessGame.isDrawByFiftyMoves()
    ) {
      return {
        finished: true,
        winner: 'draw',
        result:
          'fifty_move_rule',
      }
    }

    if (
      chessGame.isDraw()
    ) {
      return {
        finished: true,
        winner: 'draw',
        result: 'draw',
      }
    }

    return {
      finished: false,
      winner: null,
      result: null,
    }
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

    const expectedFen =
      game.fen()

    try {
      /*
       * Rebuild from the COMPLETE
       * stored PGN before making the
       * next move.
       *
       * This preserves repetition
       * history and produces a full
       * PGN instead of a one-move PGN.
       */
      const newGame =
        createGameFromState(
          expectedFen,
          pgn
        )

      /*
       * Safety check.
       *
       * The reconstructed state must
       * match the exact board state
       * we're trying to update.
       */
      if (
        newGame.fen() !==
        expectedFen
      ) {
        throw new Error(
          'Game history does not match the current position.'
        )
      }

      const move =
        newGame.move({
          from,
          to,

          ...(promotion
            ? {
                promotion,
              }
            : {}),
        })

      if (!move) {
        return
      }

      const gameResult =
        getGameResult(
          newGame
        )

      setSubmittingMove(
        true
      )

      setMoveError('')

      const updatedGame =
        await submitMove({
          gameId,

          expectedFen,

          newFen:
            newGame.fen(),

          /*
           * This is now the complete
           * game PGN.
           */
          newPgn:
            newGame.pgn(),

          newTurn:
            newGame.turn(),

          gameFinished:
            gameResult.finished,

          gameWinner:
            gameResult.winner,

          gameResult:
            gameResult.result,
        })

      const updatedChess =
        createGameFromState(
          updatedGame.fen,
          updatedGame.pgn
        )

      setGame(
        updatedChess
      )

      setLastMove({
        from:
          move.from,

        to:
          move.to,
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

      try {
        setGame(
          createGameFromState(
            fen,
            pgn
          )
        )
      } catch {
        /*
         * Ignore invalid fallback
         * state.
         */
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

      const moves =
        game.moves({
          square,
          verbose: true,
        })

      setSelectedSquare(
        square
      )

      setLegalSquares(
        moves.map(
          (move) =>
            move.to
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
      const moves =
        game.moves({
          square,
          verbose: true,
        })

      setSelectedSquare(
        square
      )

      setLegalSquares(
        moves.map(
          (move) =>
            move.to
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
      gameStatus ===
      'finished'
    ) {
      return (
        getFinishedStatus()
      )
    }

    if (
      submittingMove
    ) {
      return (
        'Submitting move...'
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
                      submittingMove
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