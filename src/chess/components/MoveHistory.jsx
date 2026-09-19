import {
  useEffect,
  useMemo,
  useRef,
} from 'react'

import { Chess } from 'chess.js'

function buildMoveHistory(
  moves
) {
  const chess =
    new Chess()

  const history = []

  if (
    !Array.isArray(moves)
  ) {
    return history
  }

  for (
    let index = 0;
    index < moves.length;
    index++
  ) {
    const storedMove =
      moves[index]

    try {
      const moveData = {
        from:
          storedMove.from,

        to:
          storedMove.to,
      }

      if (
        storedMove.promotion
      ) {
        moveData.promotion =
          storedMove.promotion
      }

      const move =
        chess.move(
          moveData
        )

      if (!move) {
        console.warn(
          'Could not replay move:',
          storedMove
        )

        break
      }

      history.push({
        index,

        moveNumber:
          Math.floor(
            index / 2
          ) + 1,

        color:
          move.color,

        san:
          move.san,

        from:
          move.from,

        to:
          move.to,
      })
    } catch (error) {
      console.warn(
        'Could not replay move history:',
        error
      )

      break
    }
  }

  return history
}

function buildMoveRows(
  history
) {
  const rows = []

  for (
    let index = 0;
    index < history.length;
    index += 2
  ) {
    const whiteMove =
      history[index]

    const blackMove =
      history[index + 1] ||
      null

    rows.push({
      moveNumber:
        Math.floor(
          index / 2
        ) + 1,

      white:
        whiteMove?.san ||
        '',

      black:
        blackMove?.san ||
        '',
    })
  }

  return rows
}

function MoveHistory({
  moves = [],
}) {
  const listRef =
    useRef(null)

  const history =
    useMemo(
      () =>
        buildMoveHistory(
          moves
        ),
      [
        moves,
      ]
    )

  const rows =
    useMemo(
      () =>
        buildMoveRows(
          history
        ),
      [
        history,
      ]
    )

  useEffect(() => {
    const element =
      listRef.current

    if (!element) {
      return
    }

    element.scrollTop =
      element.scrollHeight
  }, [
    rows.length,
  ])

  return (
    <aside className="move-history">

      <div className="move-history-header">

        <div>
          <span className="move-history-label">
            GAME
          </span>

          <h2>
            Moves
          </h2>
        </div>

        <span className="move-count">
          {history.length}{' '}
          {history.length === 1
            ? 'move'
            : 'moves'}
        </span>

      </div>

      <div
        className="move-history-list"
        ref={
          listRef
        }
      >

        {rows.length ===
        0 ? (
          <div className="move-history-empty">
            No moves yet.
          </div>
        ) : (
          rows.map(
            (
              row,
              index
            ) => {
              const isLatest =
                index ===
                rows.length - 1

              return (
                <div
                  className={
                    `move-history-row ${
                      isLatest
                        ? 'latest'
                        : ''
                    }`
                  }
                  key={
                    row.moveNumber
                  }
                >

                  <span className="move-number">
                    {
                      row.moveNumber
                    }.
                  </span>

                  <span className="move-san">
                    {
                      row.white ||
                      '—'
                    }
                  </span>

                  <span className="move-san">
                    {
                      row.black ||
                      '—'
                    }
                  </span>

                </div>
              )
            }
          )
        )}

      </div>

    </aside>
  )
}

export default MoveHistory