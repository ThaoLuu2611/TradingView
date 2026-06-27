# Project Design Guidelines

## 1. UI/UX Principles
- **Aesthetics First**: Use modern, clean design inspired by TradingView.
- **Colors**:
  - Backgrounds: Clean white/light gray (`#f0f3fa` for toolbars, `#ffffff` for main panels).
  - Text: Dark/slate for primary (`#131722`), muted gray for secondary (`#787b86`).
  - Icons: Dark gray (`#434651`) for default state.

## 2. Toast Notifications
Consistent color coding must be applied to all toast/popup notifications:
- **Error / Failure**: Red background (`#ef5350`) with white text.
- **Success / OK**: Blue background (`#2962ff`) with white text.
- **Warning / Info**: Yellow/Orange background (`#ffb74d`) with dark text (`#131722`) for contrast.
- **Positioning**: Displayed at the **top** center of the screen (`top: 10px`), NOT at the bottom.

## 3. Typography
- **Font Family**: 'Inter', sans-serif for general text. 'JetBrains Mono' for numbers, prices, and code-like data.
- **Font Sizes**: Base size is `14px`. Chart overlay text (OHLCV tooltip) is `14px` and normal weight (`weight: 'normal'`) to ensure a crisp, non-bold appearance that contrasts well with the symbol names.
