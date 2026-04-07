export function calcPoints(prediction: number, actual: number): number {
  const diff = Math.abs(prediction - actual)
  return Math.max(0, Math.round(100 - diff * 20))
}

export function calcPointsWithBonus(prediction: number, actual: number): number {
  const base = calcPoints(prediction, actual)
  const bonus = Number(prediction.toFixed(1)) === Number(actual.toFixed(1)) ? 10 : 0
  return base + bonus
}
