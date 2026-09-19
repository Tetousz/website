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
      const newGame =
        createGameFromMoves(
          moves,
          fen
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
        Array.isArray(moves) &&
        moves.length > 0
      ) {
        const latestMove =
          moves[
            moves.length - 1
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
       * Legacy games created before
       * move history existed can still
       * display their final/current
       * board from FEN.
       */
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
  }, [
    fen,
    moves,
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
       * Reconstruct the entire game
       * before every submitted move.
       */
      const newGame =
        createGameFromMoves(
          moves,
          expectedFen
        )

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

      /*
       * Store only the information
       * required to replay the move.
       */
      const storedMove = {
        from:
          move.from,

        to:
          move.to,
      }

      if (
        move.promotion
      ) {
        storedMove.promotion =
          move.promotion
      }

      const currentMoves =
        Array.isArray(moves)
          ? moves
          : []

      const newMoves = [
        ...currentMoves,
        storedMove,
      ]

      /*
       * Because newGame was created by
       * replaying every previous move,
       * chess.js now has the complete
       * repetition history here.
       */
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

          newPgn:
            newGame.pgn(),

          newMoves,

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
        createGameFromMoves(
          updatedGame.moves,
          updatedGame.fen
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