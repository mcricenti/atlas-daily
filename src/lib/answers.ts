/** Forgiving checks for typed answers (kids misspell; accents are hard to type). */

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\bsaint\b/g, 'st')
    .replace(/[^a-z]/g, '')
}

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
  }
  return dp[a.length][b.length]
}

/** Other spellings that count as fully right. */
const ALSO_ACCEPT: Record<string, string[]> = {
  'Washington, D.C.': ['Washington', 'DC'],
  'St. Paul': ['Saint Paul'],
  'Kuala Lumpur': ['KL'],
  'Mexico City': ['Ciudad de Mexico'],
}

export type TypedResult = 'exact' | 'close' | 'wrong'

/** "close" means right, apart from a small spelling slip. */
export function checkTyped(input: string, answer: string): TypedResult {
  const got = normalize(input)
  if (!got) return 'wrong'
  const targets = [answer, ...(ALSO_ACCEPT[answer] ?? [])].map(normalize)
  if (targets.includes(got)) return 'exact'
  const target = normalize(answer)
  const allowed = target.length <= 4 ? 0 : target.length <= 8 ? 1 : 2
  return distance(got, target) <= allowed ? 'close' : 'wrong'
}
