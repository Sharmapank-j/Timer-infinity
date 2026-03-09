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
   2. ALARM SOUND (Web Audio API)
═══════════════════════════════════════════════════════════ */
const AlarmSound = (() => {
  let audioCtx = null;
  let gainNode = null;

  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.connect(audioCtx.destination);
    }
    return { ctx: audioCtx, gain: gainNode };
  }

  /**
   * Play a short beep sequence (alarm-like tone).
   * @param {number} volume  0-100
   */
  function play(volume) {
    const { ctx, gain } = getCtx();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") ctx.resume();

    gain.gain.setValueAtTime(volume / 100, ctx.currentTime);

    // Three rapid beeps
    const beepDurations = [0.15, 0.15, 0.25];
    let offset = 0;
    beepDurations.forEach((dur, i) => {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(880, ctx.currentTime + offset);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + offset + dur * 0.5);
      osc.connect(gain);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + dur);
      offset += dur + 0.08;
    });
  }

  function setVolume(vol) {
    if (gainNode) gainNode.gain.setValueAtTime(vol / 100, audioCtx.currentTime);
  }

  return { play, setVolume };
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
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    timerDisplay.textContent = `${pad(m)}:${pad(s)}`;
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
    durMin:        document.getElementById("dur-min"),
    durSec:        document.getElementById("dur-sec"),
    repMin:        document.getElementById("rep-min"),
    repSec:        document.getElementById("rep-sec"),
    repeatCount:   document.getElementById("repeat-count"),
    infiniteRepeat:document.getElementById("infinite-repeat"),
    soundEnabled:  document.getElementById("sound-enabled"),
    volume:        document.getElementById("volume"),
    volumeVal:     document.getElementById("volume-val"),
  };

  /** Clamp and return integer value of an input */
  function getInt(el) {
    const v = parseInt(el.value, 10);
    return isNaN(v) ? 0 : Math.max(Number(el.min) || 0, Math.min(Number(el.max) || 9999, v));
  }

  function get() {
    return {
      durationSec:    getInt(els.durMin) * 60 + getInt(els.durSec),
      intervalSec:    getInt(els.repMin) * 60 + getInt(els.repSec),
      repeatCount:    getInt(els.repeatCount),
      isInfinite:     els.infiniteRepeat.checked,
      soundEnabled:   els.soundEnabled.checked,
      volume:         getInt(els.volume),
    };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        durMin:         els.durMin.value,
        durSec:         els.durSec.value,
        repMin:         els.repMin.value,
        repSec:         els.repSec.value,
        repeatCount:    els.repeatCount.value,
        infiniteRepeat: els.infiniteRepeat.checked,
        soundEnabled:   els.soundEnabled.checked,
        volume:         els.volume.value,
      }));
    } catch (_) { /* localStorage unavailable – silently ignore */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.durMin         !== undefined) els.durMin.value         = data.durMin;
      if (data.durSec         !== undefined) els.durSec.value         = data.durSec;
      if (data.repMin         !== undefined) els.repMin.value         = data.repMin;
      if (data.repSec         !== undefined) els.repSec.value         = data.repSec;
      if (data.repeatCount    !== undefined) els.repeatCount.value    = data.repeatCount;
      if (data.infiniteRepeat !== undefined) els.infiniteRepeat.checked = data.infiniteRepeat;
      if (data.soundEnabled   !== undefined) els.soundEnabled.checked  = data.soundEnabled;
      if (data.volume         !== undefined) els.volume.value          = data.volume;
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

  /** Called when countdown hits zero */
  function onAlarmTriggered() {
    state = "alarm";
    Controls.setState("alarm");
    UI.showFlash();

    if (soundEnabled) AlarmSound.play(volume);

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
      if (soundEnabled) AlarmSound.play(volume);
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
