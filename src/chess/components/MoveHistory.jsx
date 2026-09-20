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

        ply:
          index + 1,

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
      history[index] ||
      null

    const blackMove =
      history[index + 1] ||
      null

    rows.push({
      moveNumber:
        Math.floor(
          index / 2
        ) + 1,

      white:
        whiteMove,

      black:
        blackMove,
    })
  }

  return rows
}

function MoveHistory({
  moves = [],
  reviewPly = null,
  onSelectPly,
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
    /*
     * Only auto-scroll to the newest move while LIVE.
     * If the user is reviewing history, don't yank the
     * move list away from the position they selected.
     */
    if (
      reviewPly !== null
    ) {
      return
    }

    const element =
      listRef.current

    if (!element) {
      return
    }

    element.scrollTop =
      element.scrollHeight
  }, [
    rows.length,
    reviewPly,
  ])

  function selectPly(
    ply
  ) {
    if (!onSelectPly) {
      return
    }

    onSelectPly(
      ply
    )
  }

  function selectMoveNumber(
    row
  ) {
    /*
     * Clicking "2." means "show the position after
     * move 2". If Black has moved, that's after
     * Black's move; otherwise it's after White's.
     */
    const ply =
      row.black?.ply ||
      row.white?.ply

    if (ply) {
      selectPly(
        ply
      )
    }
  }

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

              const whiteSelected =
                reviewPly !== null &&
                row.white?.ply ===
                  reviewPly

              const blackSelected =
                reviewPly !== null &&
                row.black?.ply ===
                  reviewPly

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

                  <button
                    type="button"
                    className="move-number move-history-jump"
                    onClick={() =>
                      selectMoveNumber(
                        row
                      )
                    }
                    title={
                      `View position after move ${row.moveNumber}`
                    }
                  >
                    {
                      row.moveNumber
                    }.
                  </button>

                  {row.white ? (
                    <button
                      type="button"
                      className={
                        `move-san move-history-jump ${
                          whiteSelected
                            ? 'selected'
                            : ''
                        }`
                      }
                      onClick={() =>
                        selectPly(
                          row.white.ply
                        )
                      }
                      title={
                        `View after ${row.white.san}`
                      }
                    >
                      {
                        row.white.san
                      }
                    </button>
                  ) : (
                    <span className="move-san">
                      —
                    </span>
                  )}

                  {row.black ? (
                    <button
                      type="button"
                      className={
                        `move-san move-history-jump ${
                          blackSelected
                            ? 'selected'
                            : ''
                        }`
                      }
                      onClick={() =>
                        selectPly(
                          row.black.ply
                        )
                      }
                      title={
                        `View after ${row.black.san}`
                      }
                    >
                      {
                        row.black.san
                      }
                    </button>
                  ) : (
                    <span className="move-san">
                      —
                    </span>
                  )}

                </div>
              )
            }
          )
        )}

      </div>

      {history.length > 0 && (
        <div className="move-history-review-footer">
          {reviewPly === null ? (
            <span>
              LIVE · ← to review
            </span>
          ) : (
            <>
              <span>
                {reviewPly === 0
                  ? 'Starting position'
                  : `Move ${reviewPly} / ${history.length}`}
              </span>

              <button
                type="button"
                className="move-history-live-button"
                onClick={() =>
                  selectPly(
                    null
                  )
                }
              >
                Return to live
              </button>
            </>
          )}
        </div>
      )}

    </aside>
  )
}

export default MoveHistory
