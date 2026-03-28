/**
 * Timer Infinity – script.js
 *
 * Modules:
 *  1. LiveClock          – updates the left-panel clock every second
 *  2. TimerEngine        – countdown logic, repeat/interval handling
 *  3. AlarmSound         – Web Audio API-based alarm tone
 *  4. UI                 – DOM helpers, progress bar, flash overlay
 *  5. Settings           – read/write inputs + localStorage persistence
 *  6. Controls           – button state management
 *  7. KeyboardShortcuts  – Space / R handlers
 *  8. Init               – wires everything together on DOMContentLoaded
 */

"use strict";

/* ═══════════════════════════════════════════════════════════
   1. LIVE CLOCK
═══════════════════════════════════════════════════════════ */
const LiveClock = (() => {
  const clockEl   = document.getElementById("clock");
  const dateEl    = document.getElementById("clock-date");
  const dots      = Array.from(document.querySelectorAll(".dot"));
  let prevSec     = -1;

  /** Format a number with leading zero */
  function pad(n) { return String(n).padStart(2, "0"); }

  function tick() {
    const now = new Date();
    const h   = pad(now.getHours());
    const m   = pad(now.getMinutes());
    const s   = pad(now.getSeconds());

    clockEl.textContent = `${h}:${m}:${s}`;

    // Date label
    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    // Pulse the clock text on each new second
    const sec = now.getSeconds();
    if (sec !== prevSec) {
      clockEl.classList.add("tick");
      setTimeout(() => clockEl.classList.remove("tick"), 150);
      prevSec = sec;

      // Animate dots: light up (sec mod 5) dots
      const activeDots = (sec % 5) + 1;  // 1-5
      dots.forEach((d, i) => d.classList.toggle("active", i < activeDots));
    }
  }

  function start() {
    tick(); // immediate first render
    setInterval(tick, 250); // poll at 250 ms for sub-second accuracy
  }

  return { start };
})();


/* ═══════════════════════════════════════════════════════════
   2. ALARM SOUND (HTML5 Audio + generated WAV)
═══════════════════════════════════════════════════════════ */
const AlarmSound = (() => {
  let beepUrl     = null;
  let audioEl     = null;
  let currentDur  = 0;    // duration (seconds) the current WAV was built for
  let stopTimeout = null; // handle for the auto-stop timer

  /**
   * Build a repeating three-beep alarm tone as a WAV blob URL.
   * Each beep group is ~0.75 s; groups are repeated to fill `durationSec`.
   * Square-wave beeps: 880 Hz → 1100 Hz.
   * @param {number} durationSec  Clamped to 1–60 seconds.
   */
  function buildBeepUrl(durationSec) {
    const rate      = 8000;
    const groupDur  = 0.75; // seconds per beep group
    const beepDefs  = [
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

    /* ---- RIFF / WAV header (44 bytes) ---- */
    ws(0, "RIFF"); v.setUint32(4, 36 + len * 2, true);
    ws(8, "WAVE"); ws(12, "fmt ");
    v.setUint32(16, 16, true);            // sub-chunk size
    v.setUint16(20, 1, true);             // PCM
    v.setUint16(22, 1, true);             // mono
    v.setUint32(24, rate, true);          // sample rate
    v.setUint32(28, rate * 2, true);      // byte rate
    v.setUint16(32, 2, true);             // block align
    v.setUint16(34, 16, true);            // bits per sample
    ws(36, "data"); v.setUint32(40, len * 2, true);

    /* ---- PCM samples: repeat beep groups across the full duration ---- */
    for (let i = 0; i < len; i++) {
      const t      = i / rate;
      const tInGrp = t % groupDur; // position within the current beep group
      let sample   = 0;
      for (const b of beepDefs) {
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

  /**
   * Lazily create (or recreate when duration changes) the blob URL and
   * Audio element.
   * @param {number} durationSec
   */
  function ensureAudio(durationSec) {
    const clamped = Math.max(1, Math.min(60, durationSec));
    if (clamped !== currentDur || !beepUrl || !audioEl) {
      // Clean up old resources before rebuilding
      if (audioEl) {
        audioEl.pause();
        audioEl.src = "";
      }
      if (beepUrl) URL.revokeObjectURL(beepUrl);

      beepUrl    = buildBeepUrl(clamped);
      audioEl    = new Audio(beepUrl);
      currentDur = clamped;
    }
  }

  /**
   * Call during a user gesture (e.g. Start button click) to unlock
   * audio playback on browsers that enforce autoplay restrictions.
   */
  function init() {
    ensureAudio(8);
    audioEl.volume = 0.01;               // near-silent warm-up
    audioEl.play()
      .then(() => { audioEl.pause(); audioEl.currentTime = 0; })
      .catch(() => { console.warn("AlarmSound: browser blocked audio warm-up"); });
  }

  /**
   * Play the alarm beep for the given duration, then auto-stop.
   * @param {number} volume      0–100
   * @param {number} durationSec 1–60 (seconds the buzzer should be heard)
   */
  function play(volume, durationSec) {
    const dur = Math.max(1, Math.min(60, durationSec || 8));
    ensureAudio(dur);

    // Cancel any previous auto-stop
    clearTimeout(stopTimeout);

    audioEl.volume      = Math.max(0, Math.min(1, volume / 100));
    audioEl.currentTime = 0;
    audioEl.play().catch(() => { console.warn("AlarmSound: playback blocked"); });

    // Auto-stop after the buzzer duration to prevent overlap with the next cycle
    stopTimeout = setTimeout(() => stop(), dur * 1000);
  }

  function stop() {
    clearTimeout(stopTimeout);
    stopTimeout = null;
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
  }

  function setVolume(vol) {
    if (audioEl) audioEl.volume = Math.max(0, Math.min(1, vol / 100));
  }

  return { play, stop, setVolume, init };
})();


/* ═══════════════════════════════════════════════════════════
   3. UI HELPERS
═══════════════════════════════════════════════════════════ */
const UI = (() => {
  const timerDisplay = document.getElementById("timer-display");
  const progressBar  = document.getElementById("progress-bar");
  const flashOverlay = document.getElementById("flash-overlay");
  let flashTimeout   = null;

  function pad(n) { return String(n).padStart(2, "0"); }

  /** Update the countdown display */
  function setTimerText(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    timerDisplay.textContent = h > 0
      ? `${pad(h)}:${pad(m)}:${pad(s)}`
      : `${pad(m)}:${pad(s)}`;
  }

  /** Update the progress bar (0-100 %) */
  function setProgress(pct) {
    progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  /** Flash the alarm overlay for `duration` ms, then hide it */
  function showFlash() {
    flashOverlay.classList.remove("hidden");
    timerDisplay.classList.add("alarm-active");
  }

  function hideFlash() {
    clearTimeout(flashTimeout);
    flashOverlay.classList.add("hidden");
    timerDisplay.classList.remove("alarm-active");
  }

  return { setTimerText, setProgress, showFlash, hideFlash };
})();


/* ═══════════════════════════════════════════════════════════
   4. SETTINGS (read inputs + localStorage)
═══════════════════════════════════════════════════════════ */
const Settings = (() => {
  const STORAGE_KEY = "timerInfinitySettings";

  const els = {
    durHr:         document.getElementById("dur-hr"),
    durMin:        document.getElementById("dur-min"),
    durSec:        document.getElementById("dur-sec"),
    repMin:        document.getElementById("rep-min"),
    repSec:        document.getElementById("rep-sec"),
    repeatCount:   document.getElementById("repeat-count"),
    infiniteRepeat:document.getElementById("infinite-repeat"),
    soundEnabled:  document.getElementById("sound-enabled"),
    volume:        document.getElementById("volume"),
    volumeVal:     document.getElementById("volume-val"),
    buzzDurSec:    document.getElementById("buzz-dur"),
  };

  /** Clamp and return integer value of an input */
  function getInt(el) {
    const v = parseInt(el.value, 10);
    return isNaN(v) ? 0 : Math.max(Number(el.min) || 0, Math.min(Number(el.max) || 9999, v));
  }

  function get() {
    return {
      durationSec:    getInt(els.durHr) * 3600 + getInt(els.durMin) * 60 + getInt(els.durSec),
      intervalSec:    getInt(els.repMin) * 60 + getInt(els.repSec),
      repeatCount:    getInt(els.repeatCount),
      isInfinite:     els.infiniteRepeat.checked,
      soundEnabled:   els.soundEnabled.checked,
      volume:         getInt(els.volume),
      buzzDurSec:     getInt(els.buzzDurSec),
    };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        durHr:          els.durHr.value,
        durMin:         els.durMin.value,
        durSec:         els.durSec.value,
        repMin:         els.repMin.value,
        repSec:         els.repSec.value,
        repeatCount:    els.repeatCount.value,
        infiniteRepeat: els.infiniteRepeat.checked,
        soundEnabled:   els.soundEnabled.checked,
        volume:         els.volume.value,
        buzzDurSec:     els.buzzDurSec.value,
      }));
    } catch (_) { /* localStorage unavailable – silently ignore */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.durHr          !== undefined) els.durHr.value          = data.durHr;
      if (data.durMin         !== undefined) els.durMin.value         = data.durMin;
      if (data.durSec         !== undefined) els.durSec.value         = data.durSec;
      if (data.repMin         !== undefined) els.repMin.value         = data.repMin;
      if (data.repSec         !== undefined) els.repSec.value         = data.repSec;
      if (data.repeatCount    !== undefined) els.repeatCount.value    = data.repeatCount;
      if (data.infiniteRepeat !== undefined) els.infiniteRepeat.checked = data.infiniteRepeat;
      if (data.soundEnabled   !== undefined) els.soundEnabled.checked  = data.soundEnabled;
      if (data.volume         !== undefined) els.volume.value          = data.volume;
      if (data.buzzDurSec     !== undefined) els.buzzDurSec.value      = data.buzzDurSec;
    } catch (_) { /* corrupt storage – silently ignore */ }
  }

  /** Wire up volume display */
  function initVolumeDisplay() {
    const update = () => {
      els.volumeVal.textContent = `${els.volume.value}%`;
    };
    els.volume.addEventListener("input", update);
    update();
  }

  /** Disable/enable repeat-count input when infinite is toggled */
  function initInfiniteToggle() {
    const sync = () => {
      els.repeatCount.disabled = els.infiniteRepeat.checked;
    };
    els.infiniteRepeat.addEventListener("change", sync);
    sync();
  }

  function init() {
    load();
    initVolumeDisplay();
    initInfiniteToggle();
    // Auto-save whenever any input changes
    document.getElementById("settings-form").addEventListener("change", save);
    document.getElementById("settings-form").addEventListener("input",  save);
  }

  return { get, init };
})();


/* ═══════════════════════════════════════════════════════════
   5. CONTROLS (button enable/disable states)
═══════════════════════════════════════════════════════════ */
const Controls = (() => {
  const btnStart = document.getElementById("btn-start");
  const btnPause = document.getElementById("btn-pause");
  const btnReset = document.getElementById("btn-reset");
  const btnStop  = document.getElementById("btn-stop");

  /** @param {'idle'|'running'|'paused'|'alarm'} state */
  function setState(state) {
    switch (state) {
      case "idle":
        btnStart.disabled = false;
        btnPause.disabled = true;
        btnReset.disabled = true;
        btnStop.disabled  = true;
        btnStart.textContent = "▶ Start";
        break;
      case "running":
        btnStart.disabled = true;
        btnPause.disabled = false;
        btnReset.disabled = false;
        btnStop.disabled  = true;
        break;
      case "paused":
        btnStart.disabled = false;
        btnPause.disabled = true;
        btnReset.disabled = false;
        btnStop.disabled  = true;
        btnStart.textContent = "▶ Resume";
        break;
      case "alarm":
        btnStart.disabled = true;
        btnPause.disabled = true;
        btnReset.disabled = true;
        btnStop.disabled  = false;
        break;
    }
  }

  return { setState, btnStart, btnPause, btnReset, btnStop };
})();


/* ═══════════════════════════════════════════════════════════
   6. TIMER ENGINE
═══════════════════════════════════════════════════════════ */
const TimerEngine = (() => {
  let totalSec      = 0;   // original timer duration
  let remainingSec  = 0;   // current countdown value
  let intervalSec   = 0;   // repeat interval
  let repeatLeft    = 0;   // repeats remaining
  let isInfinite    = false;
  let soundEnabled  = false;
  let volume        = 70;
  let buzzDurSec    = 8;   // user-defined buzzer duration (seconds)

  /** Fallback repeat delay (ms) when no interval is configured */
  const DEFAULT_REPEAT_INTERVAL_MS = 5000;

  let tickInterval  = null;
  let alarmInterval = null; // interval for repeat alarm
  let state         = "idle"; // 'idle' | 'running' | 'paused' | 'alarm'

  function updateDisplay() {
    UI.setTimerText(remainingSec);
    const pct = totalSec > 0 ? ((totalSec - remainingSec) / totalSec) * 100 : 0;
    UI.setProgress(pct);
  }

  /** Tick called every second while running */
  function tick() {
    remainingSec--;
    updateDisplay();
    if (remainingSec <= 0) {
      clearInterval(tickInterval);
      tickInterval = null;
      onAlarmTriggered();
    }
  }

  /**
   * Compute how long (seconds) the buzzer should sound.
   * Uses the user-defined buzzer duration, capped to the repeat interval
   * so the beep never bleeds into the next repeat cycle.
   */
  function buzzDuration() {
    const ivSec = Math.max(0, intervalSec);
    if (ivSec > 0) return Math.min(buzzDurSec, ivSec);
    return buzzDurSec;
  }

  /** Called when countdown hits zero */
  function onAlarmTriggered() {
    state = "alarm";
    Controls.setState("alarm");
    UI.showFlash();

    if (soundEnabled) AlarmSound.play(volume, buzzDuration());

    // Schedule repeat alarms if configured
    if (isInfinite || repeatLeft > 0) {
      scheduleRepeat();
    }
  }

  function scheduleRepeat() {
    const delay = intervalSec > 0 ? intervalSec * 1000 : DEFAULT_REPEAT_INTERVAL_MS;
    alarmInterval = setInterval(() => {
      if (!isInfinite && repeatLeft <= 0) {
        stopAlarm();
        return;
      }
      if (soundEnabled) AlarmSound.play(volume, buzzDuration());
      if (!isInfinite) repeatLeft--;
    }, delay);
  }

  function start() {
    if (state === "running") return;

    if (state === "idle") {
      const s = Settings.get();
      if (s.durationSec <= 0) return; // nothing to count down

      totalSec     = s.durationSec;
      remainingSec = s.durationSec;
      intervalSec  = s.intervalSec;
      repeatLeft   = s.isInfinite ? 0 : s.repeatCount;
      isInfinite   = s.isInfinite;
      soundEnabled = s.soundEnabled;
      volume       = s.volume;
      buzzDurSec   = s.buzzDurSec || 8;

      // Initialise AudioContext now (during user-gesture) so the
      // browser allows sound playback when the alarm fires later.
      if (soundEnabled) AlarmSound.init();

      updateDisplay();
    }

    state = "running";
    Controls.setState("running");
    tickInterval = setInterval(tick, 1000);
  }

  function pause() {
    if (state !== "running") return;
    clearInterval(tickInterval);
    tickInterval = null;
    state = "paused";
    Controls.setState("paused");
  }

  function reset() {
    clearInterval(tickInterval);
    clearInterval(alarmInterval);
    tickInterval  = null;
    alarmInterval = null;
    state         = "idle";
    remainingSec  = 0;
    totalSec      = 0;
    UI.setTimerText(0);
    UI.setProgress(0);
    UI.hideFlash();
    Controls.setState("idle");
  }

  function stopAlarm() {
    clearInterval(alarmInterval);
    alarmInterval = null;
    AlarmSound.stop();
    UI.hideFlash();
    reset();
  }

  /** Toggle start/pause (Space shortcut) */
  function toggleStartPause() {
    if (state === "idle" || state === "paused") start();
    else if (state === "running") pause();
  }

  return { start, pause, reset, stopAlarm, toggleStartPause };
})();


/* ═══════════════════════════════════════════════════════════
   7. KEYBOARD SHORTCUTS
═══════════════════════════════════════════════════════════ */
function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Ignore shortcuts when user is typing in an input field
    const tag = e.target.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    if (e.code === "Space") {
      e.preventDefault();
      TimerEngine.toggleStartPause();
    } else if (e.code === "KeyR") {
      e.preventDefault();
      TimerEngine.reset();
    }
  });
}


/* ═══════════════════════════════════════════════════════════
   8. INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  // Restore saved settings
  Settings.init();

  // Start the live clock
  LiveClock.start();

  // Wire up buttons
  Controls.btnStart.addEventListener("click", TimerEngine.start);
  Controls.btnPause.addEventListener("click", TimerEngine.pause);
  Controls.btnReset.addEventListener("click", TimerEngine.reset);
  Controls.btnStop.addEventListener ("click", TimerEngine.stopAlarm);

  // Keyboard shortcuts
  initKeyboardShortcuts();

  // Initialize button states
  Controls.setState("idle");
});
