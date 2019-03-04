const { any, map, filter, join, partition, prn } = require("./IIterable.js")
const { assert, thread } = require("./lang.js")

// Board
const MOVES = map(x => Math.pow(2, x))([0, 1, 2, 3, 4, 5, 6, 7, 8])

const readBoard = s => {
  const t = s.replace(/ /g, "")
  let r = 0
  for (let i = 0; i < t.length; i += 1) {
    if (t[i] === "1") r = r | Math.pow(2, i)
  }

  return r
}

const WINS = map(readBoard)([
  "111 000 000",
  "000 111 000",
  "000 000 111",

  "100 100 100",
  "010 010 010",
  "001 001 001",

  "100 010 001",
  "001 010 100"
])

const getMoves = board =>
  filter(m => (m & board.x) === 0 && (m & board.o) === 0)(MOVES)
assert(
  prn(
    getMoves({
      x: readBoard("011 100 000"),
      o: readBoard("000 001 111")
    })
  ) === "[1,16]"
)

const doMove = move => board => ({
  ...board,
  [board.turn]: board[board.turn] | move,
  turn: board.turn === "x" ? "o" : "x"
})

const draw = board =>
  thread(
    MOVES,
    partition(3),
    map(row =>
      join(" | ")(map(p => (p & board.x ? "x" : p & board.o ? "o" : " "))(row))
    ),
    join("\n--+---+--\n"),
    s => "\n" + s,
    console.log
    // () => console.log(getPosition(board))
  )

const getPosition = board => board.x | board.o

const hasWon = ox => any(p => (p & ox) === p)(WINS)

const isEnd = board =>
  getPosition(board) === 511 ||
  any(p => (p & board.x) === p || (p & board.o) === p)(WINS)

const doc = () => {
  console.log("\n\n-----------\nTIC TAC TOE\n-----------")
}

module.exports = {
  MOVES,
  doc,
  doMove,
  draw,
  getMoves,
  getPosition,
  hasWon,
  isEnd
}
