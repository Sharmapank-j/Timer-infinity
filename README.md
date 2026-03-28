# Timer Infinity ♾️

A repeating countdown timer with a dynamic alarm buzzer — available as a Progressive Web App.

## Features

- **Countdown timer** — set any duration in hours, minutes and seconds (up to 23h 59m 59s).
- **User-defined buzzer duration** — choose exactly how long the alarm beeps (1–60 seconds). The duration is automatically capped to the repeat interval to prevent overlap.
- **Repeat alarms** — ring a set number of times or loop infinitely.
- **Adjustable volume** — live volume slider (0–100 %).
- **Live clock** — displays current time with animated second dots.
- **PWA support** — install on desktop or mobile; works offline via a cache-first service worker.
- **Keyboard shortcuts** — `Space` to start/pause, `R` to reset.
- **Settings persistence** — configuration is saved to `localStorage`.

## Usage

1. Open `index.html` in a modern browser (or install as a PWA).
2. Set the **Timer Duration** in hours, minutes and seconds.
3. Set the **Repeat Interval** (how often the buzzer re-rings after the first alarm).
4. Choose a **Repeat Count** or toggle **Infinite**.
5. Enable **Alarm Sound**, adjust the volume, and set the **Buzzer Duration** (how long the beep sounds each time, 1–60 s).
6. Click **▶ Start** (or press `Space`).

The buzzer sounds for the configured duration each time it fires, automatically stopping before the next repeat cycle.

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
