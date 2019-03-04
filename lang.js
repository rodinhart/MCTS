const assert = r => {
  if (r !== true) throw new Error("Assert failed. " + r)
}

const thread = (x, ...fs) => fs.reduce((x, f) => f(x), x)

module.exports = {
  assert,
  thread
}
