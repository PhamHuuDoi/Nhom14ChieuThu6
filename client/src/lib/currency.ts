export function formatCurrency(amount: number | string | null | undefined) {
  const numericAmount = Number(amount ?? 0)
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0

  return `${Math.round(safeAmount).toLocaleString("vi-VN")} vnđ`
}
