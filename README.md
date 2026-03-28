# Timer Infinity ♾️

A repeating countdown timer with a dynamic alarm buzzer — available as a Progressive Web App.

## Features

- **Countdown timer** — set any duration in minutes and seconds.
- **Dynamic buzzer duration** — the beep length is automatically capped to the repeat interval (up to 10 seconds), so the alarm never bleeds into the next cycle.
- **Repeat alarms** — ring a set number of times or loop infinitely.
- **Adjustable volume** — live volume slider (0–100 %).
- **Live clock** — displays current time with animated second dots.
- **PWA support** — install on desktop or mobile; works offline via a cache-first service worker.
- **Keyboard shortcuts** — `Space` to start/pause, `R` to reset.
- **Settings persistence** — configuration is saved to `localStorage`.

## Usage

1. Open `index.html` in a modern browser (or install as a PWA).
2. Set the **Timer Duration** (countdown length).
3. Set the **Repeat Interval** (how often the buzzer re-rings after the first alarm).
4. Choose a **Repeat Count** or toggle **Infinite**.
5. Enable **Alarm Sound** and adjust the volume.
6. Click **▶ Start** (or press `Space`).

The buzzer will sound for `min(intervalSeconds, 10)` seconds each time it fires,
defaulting to 8 seconds when no repeat interval is configured.

## Project Structure

```
Timer-infinity/
├── index.html      # App shell + PWA wiring
├── style.css       # Styles
├── script.js       # Timer logic (LiveClock, TimerEngine, AlarmSound, …)
├── manifest.json   # PWA manifest
├── sw.js           # Service worker (cache-first)
├── favicon.svg     # App icon
├── LICENSE         # MIT
└── README.md
```

## License

[MIT](LICENSE)
