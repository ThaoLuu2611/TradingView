// ---------------------------------------------------------------------------
// format.js – Display formatting helpers for the TradingView-clone app
// ---------------------------------------------------------------------------

/**
 * Format a price number with comma thousands separator and 2 decimal places.
 * @param {number} price
 * @returns {string}  e.g. '94,250.00'
 */
export function formatPrice(price) {
  if (price === null || price === undefined || isNaN(price)) return '—'
  return Number(price).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Format a percentage change, always showing sign.
 * @param {number} change  e.g. 2.34 or -1.23
 * @returns {string}  e.g. '+2.34%' or '-1.23%'
 */
export function formatPercent(change) {
  if (change === null || change === undefined || isNaN(change)) return '—'
  const fixed = Number(change).toFixed(2)
  return change >= 0 ? `+${fixed}%` : `${fixed}%`
}

/**
 * Format a volume figure into a human-readable abbreviation.
 * @param {number} vol
 * @returns {string}  e.g. '1.23B', '456.7M', '12.3K'
 */
export function formatVolume(vol) {
  if (vol === null || vol === undefined || isNaN(vol)) return '—'
  const abs = Math.abs(vol)
  if (abs >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000)     return `${(vol / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)         return `${(vol / 1_000).toFixed(1)}K`
  return String(vol)
}

/**
 * Format a Unix timestamp (ms) according to the active timeframe.
 *  - 1m / 5m / 15m  → 'HH:MM'
 *  - 1h / 4h        → 'MM/DD HH:MM'
 *  - 1D / 1W        → 'MMM DD YYYY'
 *
 * @param {number} timestamp  Unix timestamp in milliseconds
 * @param {string} timeframe  e.g. '1m', '5m', '1h', '4h', '1D', '1W'
 * @returns {string}
 */
export function formatDate(timestamp, timeframe) {
  if (!timestamp) return '—'
  const d = new Date(timestamp)

  const pad   = (n) => String(n).padStart(2, '0')
  const HH    = pad(d.getHours())
  const MM    = pad(d.getMinutes())
  const month = pad(d.getMonth() + 1)   // 1-based
  const day   = pad(d.getDate())
  const year  = d.getFullYear()

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthName = MONTHS[d.getMonth()]

  switch (timeframe) {
    case '1m':
    case '5m':
    case '15m':
      return `${HH}:${MM}`

    case '1h':
    case '4h':
      return `${month}/${day} ${HH}:${MM}`

    case '1D':
    case '1W':
      return `${monthName} ${day} ${year}`

    default:
      // Fallback: full ISO-like date + time
      return `${year}-${month}-${day} ${HH}:${MM}`
  }
}
