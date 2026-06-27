# TODO: Future Features

- **Cloud Integration (Database)**
  - Allow users to connect their accounts (Login/Register).
  - Use the "Save" button (cloud icon) on the Toolbar to save all chart configurations (Watchlist, customized technical indicators, preferred timeframes) to a Cloud database like Firebase, Supabase, or a custom Backend.
  - Support syncing configurations when logging in on different devices.

- **Watchlist Upgrades**
  - Sync the list in real-time (when a backend is integrated).
  - Add filtering or sorting by volatility (Change %).

- **Charts & Drawings**
  - Save the state of trendlines and Fib drawings to the Cloud (currently only Indicators and Watchlists are persistent).
  - Save multiple chart layout configurations for a single user.

- **Performance & Optimization**
  - Better memory management when the Watchlist contains a large number of symbols.
  - Add WebSocket for real-time prices (instead of HTTP polling every 30-60s) to reduce latency and provide a smooth experience identical to the real TradingView.
