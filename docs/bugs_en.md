# Bug Tracking — ChartViewPro

List of unresolved bugs, what has been tried, and next steps.

---

## Bug 1 — Changing EMA color has no effect

**Description:** User changes EMA color in the Indicator popup and clicks Save, but the chart does not update — it keeps the old color.

**Suspected cause:** KLineCharts v9 ignores the `styles.lines` property when passed into `createIndicator()` for built-in indicators (EMA, MA...). Calling `removeIndicator` + `createIndicator` again also fails to force the library to update the color.

**Already tried:**
- Using `overrideIndicator()` — did not work
- Remove then re-add the indicator — did not work

**Next steps:**
1. Try `chart.setStyles({ indicator: { EMA: { lines: [...] } } })` at the root level
2. Rewrite EMA as a Custom Indicator (`registerIndicator`) to have full control over the colors

---

## Bug 2 — Cannot pan the chart up/down when the app first opens

**Description:** When the app first loads, the user cannot drag the chart up or down (vertical pan). It only works after the user has dragged the Y-axis (price axis) at least once. TradingView allows free panning in all directions from the very start.

**Cause:** KLineCharts v9 enables Auto Scale on the Y-axis by default, which locks vertical movement. The user must manually drag the price axis once to "unlock" it. No public API was found to disable this lock without requiring user interaction.

**Note (27/06/2026):** The old workaround (dispose + init on symbol change) was removed to fix Bug 3. Bug 2 now only occurs on the very first app load, and no longer triggers when switching symbols.

**Already tried (all unsuccessful):**
1. Simulating `mousedown/mousemove/mouseup` events on the Y-axis — the library ignores synthetic events
2. `setStyles({ yAxis: { autoScale: false } })` — disables the lock but the Y-axis then gets stuck at the old price range, causing a blank chart when switching symbols
3. `dispatchEvent(new MouseEvent('dblclick'))` to reset — did not work
4. Accessing internal `_resetYAxisAutoCalcTickFlag` — not exposed as a public API

**Next steps:**
1. Read the KLineCharts v9 source code to find a way to reset `autoCalcTickFlag` without recreating the instance
2. Or patch the library if necessary

