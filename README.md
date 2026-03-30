# Timer ♾️

A simple countdown timer with a selectable buzzer duration and periodic repeat interval — available as a Progressive Web App.

## Features

- **Countdown timer** — set any duration in hours, minutes and seconds (up to 23 h 59 m 59 s).
- **Beep Duration** — choose exactly how long the buzzer sounds each time it fires (1–60 seconds).
- **Repeat Interval** — buzzer re-fires every N minutes/seconds during the countdown. Set to 0 for a single buzz at the end only.
- **PWA support** — install on desktop or mobile; works offline via a cache-first service worker.
- **Netlify-ready routing** — includes `netlify.toml` SPA-style redirect configuration.
- **Keyboard shortcuts** — `Space` to start/pause, `R` to reset.
- **Settings persistence** — configuration is saved to `localStorage`.

## Usage

1. Open `index.html` in a modern browser (or install as a PWA).
2. Set the **Timer Duration** in hours, minutes and seconds (e.g. 60 min).
3. Set the **Beep Duration** — how long each buzz lasts (e.g. 10 sec).
4. Set the **Repeat Interval** — how often the buzzer fires during the countdown (e.g. every 2 min). Set both fields to 0 to buzz only when the timer finishes.
5. Click **▶ Start** (or press `Space`).

The buzzer fires automatically at each interval and again when the timer reaches zero, sounding for the configured beep duration before stopping.

## Project Structure

```
Timer-infinity/
├── index.html      # App shell + PWA wiring
├── style.css       # Styles
├── script.js       # Timer logic (Buzzer, TimerEngine, UI, Settings)
├── manifest.json   # PWA manifest
├── sw.js           # Service worker (cache-first)
├── netlify.toml    # Netlify publish/redirect configuration
├── favicon.svg     # App icon
├── LICENSE         # MIT
└── README.md
```

## License

[MIT](LICENSE)
