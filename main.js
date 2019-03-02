const readline = require("readline")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// lang
const assert = r => {
  if (r !== true) throw new Error("Assert failed. " + r)
}

const thread = (x, ...fs) => fs.reduce((x, f) => f(x), x)

// Iterable
const iter = f => ({
  [Symbol.iterator]: f
})

const any = p => xs => {
  for (const x of xs) {
    if (p(x)) return true
  }

  return false
}

const map = f => xs =>
  iter(function*() {
    for (const x of xs) {
      yield f(x)
    }
  })

const filter = p => xs =>
  iter(function*() {
    for (const x of xs) {
      if (p(x)) yield x
    }
  })

const fold = (step, init) => xs => {
  let r = init
  for (const x of xs) {
    r = step(r, x)
  }

  return r
}

const join = s => xs => [...xs].join(s)

const length = xs => {
  let len = 0
  for (const x of xs) {
    len += 1
  }

  return len
}

const nth = n => xs => {
  let i = 0
  for (const x of xs) {
    if (i === n) return x
    i += 1
  }
}

const partition = n => xs =>
  iter(function*() {
    let c = 0
    let r = []
    for (const x of xs) {
      r.push(x)
      c += 1
      if (c >= n) {
        yield r
        c = 0
        r = []
      }
    }

    if (r.length) yield r
  })

const prn = xs => JSON.stringify([...xs])

assert(prn(partition(3)([1, 2, 3, 4, 5])) === "[[1,2,3],[4,5]]")

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

// Monte Carlo tree search
const AI = "x"

const createNode = (board, parent) => ({
  parent,
  visits: 0,
  wins: 0,
  children: {},
  board
})

const ubt = node =>
  node.wins / node.visits +
  Math.sqrt(2 * Math.log(node.parent.visits / node.visits))

const iterate = root => {
  // selection
  let node = root
  while (!isEnd(node.board)) {
    const best = fold(
      (best, move) => {
        const newBoard = doMove(move)(node.board)
        const position = getPosition(newBoard)
        const score =
          node.children[position] && node.children[position].visits
            ? ubt(node.children[position])
            : Number.MAX_SAFE_INTEGER

        if (score < best.score) return best

        return {
          score,
          board: score > best.score ? [newBoard] : best.board.concat([newBoard])
        }
      },
      {
        score: Number.MIN_SAFE_INTEGER,
        board: undefined
      }
    )(getMoves(node.board))

    const newBoard = best.board[Math.floor(best.board.length * Math.random())]
    const position = getPosition(newBoard)
    if (!node.children[position]) {
      node.children[position] = createNode(newBoard, node) // expansion
      node = node.children[position]
      break
    }

    node = node.children[position]
  }

  if (isEnd(node)) return // can't simulate

  // simulation
  let board = node.board
  while (!isEnd(board)) {
    const moves = getMoves(board)
    const move = nth(Math.floor(length(moves) * Math.random()))(moves)
    board = doMove(move)(board)
  }

  // back propegation
  const score = hasWon(board[AI])
    ? 1
    : hasWon(board[AI === "x" ? "o" : "x"])
    ? 0
    : 0.5
  while (node) {
    node.visits += 1
    node.wins += score
    node = node.parent
  }
}

const getBestMove = node => {
  const best = fold(
    (best, [position, child]) => {
      if (child.visits > best.visits) {
        return {
          visits: child.visits,
          nodes: [child]
        }
      }

      if (child.visits === best.visits) {
        best.nodes.push(child)
      }

      return best
    },
    {
      visits: Number.MIN_SAFE_INTEGER,
      nodes: []
    }
  )(Object.entries(node.children))

  return best.nodes[Math.floor(best.nodes.length * Math.random())]
}

// game
const root = createNode({
  x: 0,
  o: 0,
  turn: "x"
})

const strip = n => {
  n.parent = undefined
  Object.values(n.children).forEach(strip)

  return n
}

const viz = (key, node, indent = "") => {
  console.log(`${indent}${node.wins}/${node.visits} (${key})`)
  Object.entries(node.children).forEach(([key, child]) =>
    viz(key, child, indent + " ")
  )
}

const play = node => {
  const board = node.board
  if (isEnd(board)) {
    console.log("\n")
    console.log(
      hasWon(board[AI])
        ? `WIN for ${AI}`
        : hasWon(board[AI === "x" ? "o" : "x"])
        ? `LOSS for ${AI}`
        : `DRAW for ${AI}`
    )
    draw(board)

    if (true) {
      console.log("\n\n-----------\nTIC TAC TOE\n-----------")
      play(root)
      return
    } else {
      console.log(JSON.stringify(strip(root)))
    }
  }

  if (board.turn === "x") {
    // think
    for (let i = 0; i < 10; i += 1) {
      iterate(node)
    }
    // viz("root", root)

    play(getBestMove(node))
  } else {
    draw(board)
    rl.question(`Make your move ${board.turn}: `, s => {
      if (s === "q") {
        rl.close()
        return
      }

      const m = Number(s)
      const newBoard = doMove(nth(m - 1)(MOVES))(board)
      const position = getPosition(newBoard)
      if (position === getPosition(board)) return play(node)
      if (!node.children[position]) {
        // create node for human player move not yet in tree
        node.children[position] = createNode(newBoard, node)
      }

      play(node.children[position])
    })
  }
}

console.log("\n\n-----------\nTIC TAC TOE\n-----------")
play(root)
