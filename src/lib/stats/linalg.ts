/** Minimal dense linear algebra for small symmetric systems (p ≲ 30). */

export type Vec = number[]
export type Mat = number[][]

export const zeros = (n: number): Vec => new Array(n).fill(0)
export const zerosMat = (n: number, m = n): Mat => Array.from({ length: n }, () => new Array(m).fill(0))
export const identity = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))

export function dot(a: Vec, b: Vec): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

export function matVec(A: Mat, v: Vec): Vec {
  return A.map((row) => dot(row, v))
}

export function quadForm(v: Vec, A: Mat): number {
  return dot(v, matVec(A, v))
}

/** Inverse of a square matrix by Gauss–Jordan elimination with partial pivoting. Returns null if singular. */
export function invert(A: Mat): Mat | null {
  const n = A.length
  const M = A.map((row, i) => [...row, ...identity(n)[i]])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
    if (Math.abs(M[piv][col]) < 1e-12) return null
    ;[M[col], M[piv]] = [M[piv], M[col]]
    const d = M[col][col]
    for (let j = 0; j < 2 * n; j++) M[col][j] /= d
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = M[r][col]
      if (f === 0) continue
      for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j]
    }
  }
  return M.map((row) => row.slice(n))
}

/** Solve A x = b. Returns null if singular. */
export function solve(A: Mat, b: Vec): Vec | null {
  const inv = invert(A)
  return inv ? matVec(inv, b) : null
}

export function matMul(A: Mat, B: Mat): Mat {
  const n = A.length
  const m = B[0].length
  const k = B.length
  const C = zerosMat(n, m)
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    let s = 0
    for (let l = 0; l < k; l++) s += A[i][l] * B[l][j]
    C[i][j] = s
  }
  return C
}
