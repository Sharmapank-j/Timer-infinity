# Timer ♾️

Timer Infinity is a lightweight countdown web app with a configurable buzzer and repeat interval.  
It is installable as a Progressive Web App (PWA) and can work offline after first load.

## Website / Where to Access

- **Repository (main branch page):** https://github.com/Sharmapank-j/Timer-infinity
- **Local website (quick start):**
  1. Clone the repository.
  2. Open `index.html` directly in a modern browser, **or** serve the folder:
     - `python3 -m http.server 8000`
  3. Visit `http://localhost:8000`
- **Hosted website:** this project includes `netlify.toml` and is ready for Netlify deployment.  
  Use your Netlify site URL after deployment.

## Main Features

- **Countdown timer** — set duration in hours, minutes, and seconds (up to `23:59:59`).
- **Beep Duration** — choose exactly how long each buzzer playback lasts (`1–60` seconds).
- **Repeat Interval** — buzzer can fire every N minutes/seconds while countdown runs.
- **End-of-timer buzzer** — final alert when timer reaches zero.
- **PWA support** — install on desktop/mobile and use offline (service worker cache-first strategy).
- **Keyboard shortcuts**
  - `Space`: Start/Pause
  - `R`: Reset
- **Settings persistence** — timer settings are saved in browser `localStorage`.

## How to Use

1. Open the app in your browser.
2. Set **Timer Duration** (`Hr : Min : Sec`).
3. Set **Beep Duration** in seconds (`1–60`).
4. Set **Repeat Interval** (`Min : Sec`).
   - Set both interval fields to `0` to buzz only once at the end.
5. Click **▶ Start**.
6. Use:
   - **⏸ Pause** to pause active countdown
   - **↺ Reset** to return to configured duration
   - **✕ Stop Buzzer** to stop active buzzing immediately

## PWA Details

- `manifest.json` defines install metadata (name, icons, colors, display mode).
- `sw.js` provides offline support with cached app shell assets.
- Service worker registration happens in `index.html`.

## Project Structure

```
Timer-infinity/
├── index.html      # App shell + semantic UI + PWA wiring
├── style.css       # Styling and responsive layout
├── script.js       # Timer, settings, buzzer, and UI logic
├── manifest.json   # PWA manifest
├── sw.js           # Service worker (cache-first strategy)
├── netlify.toml    # Netlify publish/redirect configuration
├── favicon.svg     # App icon
├── LICENSE         # MIT License
└── README.md       # Main branch documentation page
```

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript (no framework)
- HTML5 Audio (generated WAV buzzer)
- Progressive Web App APIs (Manifest + Service Worker)

## License

This project is licensed under the [MIT](LICENSE) License.
