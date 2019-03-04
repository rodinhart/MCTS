const readline = require("readline")

const { fold, length, nth } = require("./IIterable.js")
const {} = require("./lang.js")
const game = require("./tictactoe.js")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Monte Carlo tree search
const AI = "x"

const better = (a, b) => {
  if (AI === "x") {
    return a > b
  }

  return a < b
}

const worse = (a, b) => {
  if (AI === "x") {
    return a < b
  }

  return a > b
}

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
  while (!game.isEnd(node.board)) {
    const best = fold(
      (best, move) => {
        const newBoard = game.doMove(move)(node.board)
        const position = game.getPosition(newBoard)
        const score =
          node.children[position] && node.children[position].visits
            ? ubt(node.children[position])
            : AI === "x"
            ? Number.MAX_SAFE_INTEGER
            : Number.MIN_SAFE_INTEGER

        if (worse(score, best.score)) return best

        return {
          score,
          board: better(score, best.score)
            ? [newBoard]
            : best.board.concat([newBoard])
        }
      },
      {
        score: AI === "x" ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER,
        board: undefined
      }
    )(game.getMoves(node.board))

    const newBoard = best.board[Math.floor(best.board.length * Math.random())]
    const position = game.getPosition(newBoard)
    if (!node.children[position]) {
      node.children[position] = createNode(newBoard, node) // expansion
      node = node.children[position]
      break
    }

    node = node.children[position]
  }

  if (game.isEnd(node)) return // can't simulate

  // simulation
  let board = node.board
  while (!game.isEnd(board)) {
    const moves = game.getMoves(board)
    const move = nth(Math.floor(length(moves) * Math.random()))(moves)
    board = game.doMove(move)(board)
  }

  // back propegation
  const score = game.hasWon(board.x) ? 1 : game.hasWon(board.o) ? 0 : 0.5
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

const viz = (key, node, indent = "") => {
  console.log(`${indent}${node.wins}/${node.visits} (${key})`)
  Object.entries(node.children).forEach(([key, child]) =>
    viz(key, child, indent + " ")
  )
}

const play = node => {
  const board = node.board
  if (game.isEnd(board)) {
    console.log("\n")
    console.log(
      game.hasWon(board[AI])
        ? `WIN for ${AI}`
        : game.hasWon(board[AI === "x" ? "o" : "x"])
        ? `LOSS for ${AI}`
        : `DRAW for ${AI}`
    )
    game.draw(board)

    game.doc()
    play(root)
    return
  }

  if (board.turn === AI) {
    // think
    for (let i = 0; i < 10; i += 1) {
      iterate(node)
    }
    // viz("root", root)

    play(getBestMove(node))
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
      if (position === game.getPosition(board)) return play(node)
      if (!node.children[position]) {
        // create node for human player move not yet in tree
        node.children[position] = createNode(newBoard, node)
      }

      play(node.children[position])
    })
  }
}

game.doc()
play(root)
