const readline = require("readline")

const { filter, fold, length, map, nth, sum } = require("./IIterable.js")
const { get, thread } = require("./lang.js")
const game = require("./tictactoe.js")

const wrand = xs => {
  const weights = [...xs]
  const total = sum(weights)

  let r = Math.random() * total
  for (let i = 0; i < weights.length; i += 1) {
    r -= weights[i]
    if (r <= 0) return i
  }

  throw new Error("wrand failed.")
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Monte Carlo tree search
const createNode = (board, parent) => ({
  parent,
  visits: 0,
  wins: 0,
  children: {},
  board
})

const ubt = node => {
  if (node.visits === 0) throw new Error("Number of visits is 0")

  return (
    node.wins / node.visits +
    Math.sqrt((2 * Math.log(node.parent.visits)) / node.visits)
  )
}

const iterate = root => {
  // selection
  let node = root
  do {
    if (game.isEnd(node.board)) break

    const moves = thread(
      game.getMoves(node.board),
      map(move => {
        const newBoard = game.doMove(move)(node.board)
        const hash = game.getHash(newBoard)

        return {
          node,
          newBoard,
          hash
        }
      })
    )

    const unexplored = thread(
      moves,
      filter(
        ({ node, hash }) => !node.children[hash] || !node.children[hash].visits
      )
    )

    if (length(unexplored) !== 0) {
      const index = wrand(map(() => 1)(unexplored))
      node.children[nth(index)(unexplored).hash] = createNode(
        nth(index)(unexplored).newBoard,
        node
      )
      node = node.children[nth(index)(unexplored).hash]
      // console.log(`Unexplored ${index}`, node)
      break
    }

    const explored = thread(
      moves,
      filter(
        ({ node, hash }) => node.children[hash] && node.children[hash].visits
      )
    )

    const index = wrand(
      map(({ node, hash }) => ubt(node.children[hash]))(moves)
    )
    // console.log(`Explored ${index}`)
    node = node.children[nth(index)(explored).hash]
  } while (true)

  if (game.isEnd(node)) return // can't simulate

  // simulation
  let board = node.board
  while (!game.isEnd(board)) {
    const moves = game.getMoves(board)
    const index = wrand(map(() => 1)(moves))
    const move = nth(index)(moves)
    board = game.doMove(move)(board)
  }

  // back propegation
  // game.draw(board)
  while (node) {
    node.visits += 1
    if (game.hasWon(board[node.board.turn === "x" ? "o" : "x"])) {
      node.wins += 1
    } else if (!game.hasWon(board[node.board.turn])) {
      node.wins += 0.5
    }

    node = node.parent
  }
}

const getBestMoveX = node =>
  thread(
    Object.values(node.children),
    fold(
      (r, n) =>
        console.log(r.visits, n.visits) || (n.visits > r.visits ? n : r),
      {
        visits: 0
      }
    )
  )

const getBestMove = node => {
  return thread(
    Object.values(node.children),
    map(node => {
      const score = node.wins / node.visits

      return {
        node,
        score
      }
    }),
    nodes => {
      const index = wrand(map(get("score"))(nodes))

      return nth(index)(nodes).node
    }
  )
}

// game
const root = createNode({
  x: 0,
  o: 0,
  turn: "x"
})

const viz = (key, node, indent = "") => {
  console.log(`${indent}${node.wins}/${node.visits} (${key})`)
  Object.entries(node.children).forEach(([key, child]) =>
    viz(key, child, indent + "  ")
  )
}

let games = 0
const stats = [0, 0, 0]
const play = (node, human) => {
  if (!human) {
    // setup game
    console.log(`x: ${stats[0]}, o: ${stats[1]}, -: ${stats[2]}`)

    if (games) {
      games -= 1
      if (games) {
        play(node, [])
        return
      } else {
        // viz("root", root)
      }
    }

    rl.question(`\nhuman: `, s => {
      if (s === "q") {
        rl.close()
        return
      }

      if (s === "") {
        stats[0] = 0
        stats[1] = 0
        stats[2] = 0
        games = 100
      }

      game.doc()
      play(node, s.split(""))
    })
    return
  }

  const board = node.board
  if (game.isEnd(board)) {
    // end of game
    if (game.hasWon(board.x)) {
      stats[0] += 1
    } else if (game.hasWon(board.o)) {
      stats[1] += 1
    } else {
      stats[2] += 1
    }

    console.log(
      game.hasWon(board.x)
        ? `WIN for x`
        : game.hasWon(board.o)
        ? `WIN for "o"`
        : `DRAW`
    )
    game.draw(board)

    play(root)
    return
  }

  if (!human.includes(board.turn)) {
    // think
    for (let i = 0; i < 100; i += 1) {
      iterate(node)
    }
    // viz("root", root)

    play(getBestMove(node), human)
  } else {
    game.draw(board)
    rl.question(`Make your move ${board.turn}: `, s => {
      if (s === "q") {
        rl.close()
        return
      }

      const m = Number(s)
      const newBoard = game.doMove(nth(m - 1)(game.MOVES))(board)
      const position = game.getPosition(newBoard)
      if (position === game.getPosition(board)) return play(node, human)
      if (!node.children[position]) {
        // create node for human player move not yet in tree
        node.children[position] = createNode(newBoard, node)
      }

      play(node.children[position], human)
    })
  }
}

play(root)
