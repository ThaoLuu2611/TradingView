# Watchlist — Detailed Requirements

---

## 1. Delete button on each row

- When hovering over a row in the watchlist → the price shifts right, a **Delete (✕)** button appears at the end of the row on the right
- No permanent empty space is created — the price only shifts on hover
- The delete button must be large enough and clearly visible (not faint or tiny)
- Click ✕ → removes the symbol from the watchlist + **saves immediately to localStorage** (no Save button needed)
- Next time the app is opened, the deleted symbol does not reappear
- Deleting from the watchlist does not affect the chart currently displayed

---

## 2. Adding a symbol to the Watchlist

### Method 1 — ＋ button on the Navbar
- A **＋** icon appears to the left of the maximize/minimize button in the chart header
- Only visible when the current symbol is **not yet in** the watchlist
- When the symbol is already in the watchlist → the ＋ button **disappears**
- Click ＋ → adds the symbol to the watchlist + saves immediately + shows a **blue toast** (success)

### Method 2 — Right-click on Chart (Context Menu)
- Right-click anywhere on the chart area → a small context menu appears
- Menu content depends on watchlist status:
  - If symbol is **not in** the watchlist: shows `Add to Watchlist`
  - If symbol **is already in** the watchlist: shows `Remove from Watchlist`
- Click → performs the action + saves immediately
- Click outside the menu → closes it

---

## 3. Toast notification color rules

- ✅ **Success** → **blue background** (success color)
- ❌ **Error** → **red background**
- **Never use red for success messages**

---

## 4. Watchlist price data source

- **Crypto**: Use **Binance** — CoinGecko is no longer used
- **Stocks**: Yahoo Finance, polled every 60s
