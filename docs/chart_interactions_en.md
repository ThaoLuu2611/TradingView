# Chart Interactions — Detailed Requirements

---

## 1. Panning (moving the chart)

- **Left/Right on the chart area**: Move the timeline left or right (horizontal pan) — built-in KLineCharts behavior
- **Up/Down on the chart area**: Move the chart up or down — **must work immediately when the app opens, no prior action required**
- **Up/Down on the price axis (Y-axis)**: Zoom the price scale in or out

> ⚠️ **Bug #2 (not yet fixed):** Currently, vertical panning only works after the user has dragged the Y-axis at least once. See `bugs.md` for details.

---

## 2. Zooming the price axis (Y-axis)

- **Swipe up on the price axis**: Zoom in (price range narrows — chart appears larger)
- **Swipe down on the price axis**: Zoom out (price range widens — chart appears smaller)

---

## 3. Zooming the timeline (X-axis)

- **Scroll wheel out**: Show more candles (zoom out the view)
- **Scroll wheel in**: Show fewer candles (zoom in the view)

---

## 4. Auto Scale

- When first opening the app or switching to a different symbol: the chart **automatically** adjusts the Y-axis to fit the candles — no manual action needed
- Double-click on the price axis: resets back to Auto Scale

> ⚠️ **Bug #3 (not yet fixed):** When switching symbols, the chart flashes/jumps briefly before showing the new data. See `bugs.md` for details.
