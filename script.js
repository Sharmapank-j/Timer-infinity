/**
 * Timer – script.js
 *
 * Three-setting countdown timer:
 *   • Timer Duration  – total time to count down
 *   • Beep Duration   – how long each buzz lasts (seconds)
 *   • Repeat Interval – how often to buzz during the countdown
 *                       (0 = buzz once when time is up)
 *
 * Modules:
 *   1. Buzzer      – generates a WAV blob and plays it for a set duration
 *   2. UI          – countdown display, progress bar, overlay, status text
 *   3. Settings    – reads inputs + localStorage persistence
 *   4. TimerEngine – countdown + periodic beep logic
 *   5. Init        – wires everything on DOMContentLoaded
 */

"use strict";

/* ═══════════════════════════════════════════════════════════
   1. BUZZER  (HTML5 Audio + generated WAV blob)
═══════════════════════════════════════════════════════════ */
const Buzzer = (() => {
  let blobUrl     = null;
  let audioEl     = null;
  let builtForSec = 0;
  let stopTimer   = null;

  /**
   * Build a repeating 3-beep tone as a WAV blob URL.
   * Each beep group ≈ 0.75 s (880 Hz → 1100 Hz square waves).
   * @param {number} durationSec  1–60
   */
  function buildWav(durationSec) {
    const rate     = 8000;
    const groupDur = 0.75;
    const beeps    = [
      { start: 0,    dur: 0.15 },
      { start: 0.23, dur: 0.15 },
      { start: 0.46, dur: 0.25 },
    ];
    const totalSec = Math.max(1, Math.min(60, durationSec));
    const len      = Math.ceil(rate * totalSec);
    const buf      = new ArrayBuffer(44 + len * 2);
    const v        = new DataView(buf);

    function ws(o, s) {
      for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
    }

    ws(0, "RIFF"); v.setUint32(4, 36 + len * 2, true);
    ws(8, "WAVE"); ws(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1,  true);        // PCM
    v.setUint16(22, 1,  true);        // mono
    v.setUint32(24, rate,       true);
    v.setUint32(28, rate * 2,   true);
    v.setUint16(32, 2,          true);
    v.setUint16(34, 16,         true);
    ws(36, "data"); v.setUint32(40, len * 2, true);

    for (let i = 0; i < len; i++) {
      const t      = i / rate;
      const tInGrp = t % groupDur;
      let sample   = 0;
      for (const b of beeps) {
        if (tInGrp >= b.start && tInGrp < b.start + b.dur) {
          const freq = (tInGrp - b.start) < b.dur * 0.5 ? 880 : 1100;
          sample = (Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1) * 0.5;
          break;
        }
      }
      v.setInt16(44 + i * 2, sample * 32767 | 0, true);
    }

    return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  }

  /** Rebuild audio element only when duration has changed. */
  function ensure(durationSec) {
    const sec = Math.max(1, Math.min(60, durationSec));
    if (sec === builtForSec && blobUrl && audioEl) return;
    if (audioEl) { audioEl.pause(); audioEl.src = ""; }
    if (blobUrl)   URL.revokeObjectURL(blobUrl);
    blobUrl      = buildWav(sec);
    audioEl      = new Audio(blobUrl);
    builtForSec  = sec;
  }

  /**
   * Warm up audio during a user gesture so autoplay works later.
   * Call on the first button click.
   */
  function warmUp() {
    ensure(10);
    audioEl.volume = 0.01;
    audioEl.play()
      .then(() => { audioEl.pause(); audioEl.currentTime = 0; })
      .catch(() => {});
  }

  /**
   * Play the buzzer for `durationSec` seconds, then stop automatically.
   * @param {number} durationSec  1–60
   */
  function play(durationSec) {
    const sec = Math.max(1, Math.min(60, durationSec));
    ensure(sec);
    clearTimeout(stopTimer);
    audioEl.volume      = 0.8;
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
    stopTimer = setTimeout(() => stop(), sec * 1000);
  }

  function stop() {
    clearTimeout(stopTimer);
    stopTimer = null;
    if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
  }

  return { warmUp, play, stop };
})();


/* ═══════════════════════════════════════════════════════════
   2. UI HELPERS
═══════════════════════════════════════════════════════════ */
const UI = (() => {
  const display  = document.getElementById("timer-display");
  const progBar  = document.getElementById("progress-bar");
  const overlay  = document.getElementById("buzz-overlay");
  const statusEl = document.getElementById("status-label");

  function pad(n) { return String(n).padStart(2, "0"); }

  function setTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    display.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function setProgress(pct) {
    progBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function showBuzz() {
    overlay.classList.remove("hidden");
    display.classList.add("buzzing");
  }

  function hideBuzz() {
    overlay.classList.add("hidden");
    display.classList.remove("buzzing");
  }

  return { setTime, setProgress, setStatus, showBuzz, hideBuzz };
})();


/* ═══════════════════════════════════════════════════════════
   3. SETTINGS  (read inputs + localStorage)
═══════════════════════════════════════════════════════════ */
const Settings = (() => {
  const KEY = "timerSettings_v2";

  const el = {
    durHr:   document.getElementById("dur-hr"),
    durMin:  document.getElementById("dur-min"),
    durSec:  document.getElementById("dur-sec"),
    beepDur: document.getElementById("beep-dur"),
    intMin:  document.getElementById("int-min"),
    intSec:  document.getElementById("int-sec"),
  };

  function int(input) {
    const v = parseInt(input.value, 10);
    return isNaN(v) ? 0 : Math.max(+input.min || 0, Math.min(+input.max || 9999, v));
  }

  function get() {
    return {
      durationSec: int(el.durHr) * 3600 + int(el.durMin) * 60 + int(el.durSec),
      beepDurSec:  int(el.beepDur),
      intervalSec: int(el.intMin) * 60 + int(el.intSec),
    };
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        durHr:   el.durHr.value,
        durMin:  el.durMin.value,
        durSec:  el.durSec.value,
        beepDur: el.beepDur.value,
        intMin:  el.intMin.value,
        intSec:  el.intSec.value,
      }));
    } catch (_) {}
  }

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (d.durHr   !== undefined) el.durHr.value   = d.durHr;
      if (d.durMin  !== undefined) el.durMin.value  = d.durMin;
      if (d.durSec  !== undefined) el.durSec.value  = d.durSec;
      if (d.beepDur !== undefined) el.beepDur.value = d.beepDur;
      if (d.intMin  !== undefined) el.intMin.value  = d.intMin;
      if (d.intSec  !== undefined) el.intSec.value  = d.intSec;
    } catch (_) {}
  }

  function init() {
    load();
    document.getElementById("settings-form").addEventListener("change", save);
    document.getElementById("settings-form").addEventListener("input",  save);
  }

  return { get, init };
})();


/* ═══════════════════════════════════════════════════════════
   4. TIMER ENGINE
═══════════════════════════════════════════════════════════ */
const TimerEngine = (() => {
  let totalSec     = 0;
  let remainingSec = 0;
  let beepDurSec   = 10;
  let intervalSec  = 0;
  let timeSinceBeep = 0;  // seconds since the last beep
  let tickId       = null;
  let state        = "idle"; // idle | running | paused | done

  const btnStart = document.getElementById("btn-start");
  const btnPause = document.getElementById("btn-pause");
  const btnReset = document.getElementById("btn-reset");
  const btnStop  = document.getElementById("btn-stop");

  function setButtons(s) {
    btnStart.disabled = (s === "running" || s === "done");
    btnPause.disabled = (s !== "running");
    btnReset.disabled = (s === "idle");
    btnStop.disabled  = (s !== "done");
    btnStart.textContent = s === "paused" ? "▶ Resume" : "▶ Start";
  }

  function updateDisplay() {
    UI.setTime(remainingSec);
    const pct = totalSec > 0 ? ((totalSec - remainingSec) / totalSec) * 100 : 0;
    UI.setProgress(pct);
  }

  function doBuzz() {
    UI.showBuzz();
    Buzzer.play(beepDurSec);
    setTimeout(() => UI.hideBuzz(), beepDurSec * 1000);
    timeSinceBeep = 0;
  }

  function tick() {
    remainingSec--;
    timeSinceBeep++;
    updateDisplay();

    // Periodic beep during countdown
    if (intervalSec > 0 && timeSinceBeep >= intervalSec) {
      doBuzz();
    }

    // Timer finished
    if (remainingSec <= 0) {
      clearInterval(tickId);
      tickId = null;
      state  = "done";
      setButtons("done");
      UI.setStatus("Time's up!");
      doBuzz();
    }
  }

  function start() {
    if (state === "running") return;

    if (state === "idle") {
      const s = Settings.get();
      if (s.durationSec <= 0) { UI.setStatus("Set a duration first!"); return; }
      totalSec      = s.durationSec;
      remainingSec  = s.durationSec;
      beepDurSec    = s.beepDurSec;
      intervalSec   = s.intervalSec;
      timeSinceBeep = 0;
      updateDisplay();
      Buzzer.warmUp();
    }

    state = "running";
    setButtons("running");
    UI.setStatus("Running…");
    tickId = setInterval(tick, 1000);
  }

  function pause() {
    if (state !== "running") return;
    clearInterval(tickId);
    tickId = null;
    state  = "paused";
    setButtons("paused");
    UI.setStatus("Paused");
  }

  function reset() {
    clearInterval(tickId);
    tickId       = null;
    state        = "idle";
    remainingSec = 0;
    totalSec     = 0;
    Buzzer.stop();
    UI.hideBuzz();
    UI.setTime(0);
    UI.setProgress(0);
    UI.setStatus("Ready");
    setButtons("idle");
  }

  function stopBuzzer() {
    Buzzer.stop();
    UI.hideBuzz();
    reset();
  }

  function toggleStartPause() {
    if (state === "idle" || state === "paused") start();
    else if (state === "running") pause();
  }

  // Expose for Init
  return { start, pause, reset, stopBuzzer, toggleStartPause };
})();


/* ═══════════════════════════════════════════════════════════
   5. INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  Settings.init();
  UI.setStatus("Ready");

  document.getElementById("btn-start").addEventListener("click", TimerEngine.start);
  document.getElementById("btn-pause").addEventListener("click", TimerEngine.pause);
  document.getElementById("btn-reset").addEventListener("click", TimerEngine.reset);
  document.getElementById("btn-stop" ).addEventListener("click", TimerEngine.stopBuzzer);

  document.addEventListener("keydown", (e) => {
    const tag = e.target.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    if (e.code === "Space") { e.preventDefault(); TimerEngine.toggleStartPause(); }
    if (e.code === "KeyR")  { e.preventDefault(); TimerEngine.reset(); }
  });
});
