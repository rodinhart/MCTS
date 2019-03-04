const readline = require("readline")

const { fold, length, nth } = require("./IIterable.js")
const {} = require("./lang.js")
const game = require("./tictactoe.js")

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
  while (node) {
    node.visits += 1
    node.wins += game.hasWon(node.board.turn)
      ? 1
      : game.hasWon(node.board.turn)
      ? 0
      : 0.5
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

const stats = [0, 0, 0]
const play = (node, human) => {
  if (!human) {
    // setup game
    console.log(`x: ${stats[0]}, o: ${stats[1]}, -: ${stats[2]}`)
    rl.question(`\nhuman: `, s => {
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
