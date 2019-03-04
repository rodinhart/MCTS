const { assert } = require("./lang")

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

module.exports = {
  any,
  map,
  filter,
  fold,
  join,
  length,
  nth,
  partition,
  prn
}
