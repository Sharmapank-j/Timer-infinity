# Timer Infinity ♾️

A repeating countdown timer with configurable intervals, repeat counts, and alarm sound. Works offline as a Progressive Web App (PWA).

## Features

- **Countdown timer** — set duration in minutes and seconds
- **Repeating alarm** — configure how often and how many times the alarm repeats
- **Infinite mode** — alarm repeats indefinitely until manually stopped
- **Adjustable volume** — slider control for alarm loudness
- **Live clock** — real-time clock display with animated seconds dots
- **Keyboard shortcuts** — `Space` to start/pause, `R` to reset
- **Offline support** — works without internet via Service Worker caching
- **Installable PWA** — add to home screen on mobile or desktop
- **Responsive design** — adapts to desktop and mobile screens
- **Settings persistence** — your configuration is saved in localStorage

## Usage

1. Open `index.html` in a browser (or deploy to any static host)
2. Set the **Timer Duration** (minutes : seconds)
3. Set the **Repeat Interval** — how long to wait between alarm buzzes
4. Set the **Number of Repeats** — or check **Infinite** for endless repeats
5. Adjust **Volume** and toggle **Enable Sound**
6. Press **▶ Start** (or `Space`) to begin the countdown
7. When the timer reaches zero, the alarm buzzes for ~8 seconds
8. Press **✕ Stop Alarm** to silence and reset

## Keyboard Shortcuts

| Key     | Action         |
|---------|----------------|
| `Space` | Start / Pause  |
| `R`     | Reset          |

## Project Structure

```
├── index.html       # Main HTML page
├── script.js        # All application logic
├── style.css        # Dark-mode-first responsive styles
├── manifest.json    # PWA web app manifest
├── sw.js            # Service worker for offline caching
├── favicon.svg      # App icon
├── LICENSE          # MIT License
└── README.md        # This file
```

## License

[MIT](LICENSE)
