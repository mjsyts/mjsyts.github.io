// script.js — 15-bit LFSR Visualizer
// Fixes "Play stops" by:
//  - not hanging forever on transitionend (timeout fallback)
//  - graceful abort if DOM isn't what we expect
(() => {
  const N_BITS = 15;
  const MSB_INDEX = N_BITS - 1; // 14
  const MASK = (1 << N_BITS) - 1; // 0x7FFF

  // Elements
  const registerEl = document.getElementById("register");
  const bubbleEl = document.getElementById("xorBubble");

  const seedInput = document.getElementById("seedInput");
  const applySeedBtn = document.getElementById("applySeed");
  const randomSeedBtn = document.getElementById("randomSeed");
  const resetBtn = document.getElementById("reset");

  const stepBtn = document.getElementById("stepBtn");
  const playBtn = document.getElementById("playBtn");
  const speedRange = document.getElementById("speedRange");

  const cycleOut = document.getElementById("cycleOut");
  const binOut = document.getElementById("binOut");
  const hexOut = document.getElementById("hexOut");
  const decOut = document.getElementById("decOut");

  // Guard: if index.html is still plaintext/markdown, stop early
  const required = [
    registerEl,
    bubbleEl,
    seedInput,
    applySeedBtn,
    randomSeedBtn,
    resetBtn,
    stepBtn,
    playBtn,
    speedRange,
    cycleOut,
    binOut,
    hexOut,
    decOut,
  ];
  if (required.some((x) => !x)) {
    // Fail quietly; avoids infinite errors that "stop" play.
    // You can open devtools to see this message.
    console.warn(
      "[lfsr-15] Missing required DOM elements. Ensure index.html has the expected IDs."
    );
    return;
  }

  let state = 0x7fff; // default seed
  let initialSeed = state;
  let cycle = 0;

  let playing = false;
  let playLoopRunning = false;

  // Build 15 cells (left-to-right: MSB=14 ... LSB=0)
  const cells = [];
  for (let i = MSB_INDEX; i >= 0; i--) {
    const bit = document.createElement("div");
    bit.className = "bit";
    bit.dataset.bitIndex = String(i);

    const idx = document.createElement("span");
    idx.className = "index";
    idx.textContent = String(i);

    const val = document.createElement("span");
    val.className = "value";
    val.textContent = "0";

    bit.appendChild(idx);
    bit.appendChild(val);
    registerEl.appendChild(bit);
    cells.push(bit);
  }

  const toBinaryString = (x) => x.toString(2).padStart(N_BITS, "0");
  const toHexString = (x) => "0x" + x.toString(16).toUpperCase().padStart(4, "0");

  function renderState() {
    // cells[0] -> bit14, cells[14] -> bit0
    for (let uiIdx = 0; uiIdx < cells.length; uiIdx++) {
      const logicalBitIndex = MSB_INDEX - uiIdx;
      const bitVal = (state >> logicalBitIndex) & 1;
      cells[uiIdx].querySelector(".value").textContent = String(bitVal);
      cells[uiIdx].classList.remove("just-updated");
    }

    cycleOut.textContent = String(cycle);
    binOut.textContent = toBinaryString(state);
    hexOut.textContent = toHexString(state);
    decOut.textContent = String(state);
  }

  function parseSeed(inputStr) {
    const s = String(inputStr).trim().toLowerCase();
    let value;

    if (s.startsWith("0x")) value = parseInt(s.slice(2), 16);
    else if (/^[01]+$/.test(s)) value = parseInt(s, 2);
    else value = parseInt(s, 10);

    if (!Number.isFinite(value)) return null;
    return value & MASK;
  }

  function clearHighlights() {
    for (const c of cells) c.classList.remove("rmb-active", "lmb-target");
  }

  function highlightRMBs(msbCell, lsbCell, bit1Cell) {
    lsbCell.classList.add("rmb-active");
    bit1Cell.classList.add("rmb-active");
    msbCell.classList.add("lmb-target");
  }

  function speedFactor() {
    const v = parseFloat(speedRange.value || "1");
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  function animateBubble(lsbCell, bit1Cell, msbCell, value, spd) {
    return new Promise((resolve) => {
      const regRect = registerEl.getBoundingClientRect();
      const lsbRect = lsbCell.getBoundingClientRect();
      const bit1Rect = bit1Cell.getBoundingClientRect();
      const msbRect = msbCell.getBoundingClientRect();

      const startX = (lsbRect.left + bit1Rect.right) / 2 - regRect.left;
      const startY = Math.min(lsbRect.top, bit1Rect.top) - regRect.top - 12;

      const endX = msbRect.left + msbRect.width / 2 - regRect.left;
      const endY = msbRect.top - regRect.top - 12;

      bubbleEl.textContent = String(value);

      const dur = Math.round(520 / spd);
      bubbleEl.style.transitionDuration = `${dur}ms`;
      bubbleEl.style.left = `${startX}px`;
      bubbleEl.style.top = `${startY}px`;
      bubbleEl.classList.add("on");

      // reflow
      void bubbleEl.offsetWidth;

      requestAnimationFrame(() => {
        bubbleEl.style.left = `${endX}px`;
        bubbleEl.style.top = `${endY}px`;
      });

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        bubbleEl.classList.remove("on");
        bubbleEl.removeEventListener("transitionend", finish);
        resolve();
      };

      // If transitionend doesn't fire, do not hang forever.
      bubbleEl.addEventListener("transitionend", finish);
      setTimeout(finish, dur + 60);
    });
  }

  async function step(animated = true) {
    const lsb = state & 1; // bit0
    const bit1 = (state >> 1) & 1; // bit1
    const newBit = lsb ^ bit1;

    const msbCell = cells[0]; // bit14
    const bit1Cell = cells[cells.length - 2]; // bit1
    const lsbCell = cells[cells.length - 1]; // bit0

    clearHighlights();
    highlightRMBs(msbCell, lsbCell, bit1Cell);

    if (animated) {
      await animateBubble(lsbCell, bit1Cell, msbCell, newBit, speedFactor());
    }

    // shift right, insert at MSB
    const shifted = (state >> 1) & MASK;
    state = (shifted | (newBit << MSB_INDEX)) & MASK;

    cycle++;
    renderState();

    msbCell.classList.add("just-updated");
    clearHighlights();
  }

  async function playLoop() {
    if (playLoopRunning) return;
    playLoopRunning = true;

    playing = true;
    playBtn.textContent = "pause";
    stepBtn.disabled = true;
    applySeedBtn.disabled = true;
    randomSeedBtn.disabled = true;
    resetBtn.disabled = true;

    try {
      while (playing) {
        await step(true);
        const spd = speedFactor();
        const pause = Math.round(110 / spd);
        await new Promise((r) => setTimeout(r, pause));
      }
    } catch (err) {
      console.error("[lfsr-15] playLoop stopped due to error:", err);
      playing = false;
    } finally {
      playBtn.textContent = "play";
      stepBtn.disabled = false;
      applySeedBtn.disabled = false;
      randomSeedBtn.disabled = false;
      resetBtn.disabled = false;
      playLoopRunning = false;
    }
  }

  function stopPlaying() {
    playing = false;
  }

  // Events
  stepBtn.addEventListener("click", async () => {
    stopPlaying();
    await step(true);
  });

  playBtn.addEventListener("click", () => {
    if (playing) stopPlaying();
    else playLoop();
  });

  applySeedBtn.addEventListener("click", () => {
    const parsed = parseSeed(seedInput.value);
    if (parsed === null) {
      alert(
        "Enter a valid 15-bit value (binary up to 15 bits, decimal 0..32767, or hex 0x0000..0x7FFF)."
      );
      return;
    }
    stopPlaying();
    initialSeed = parsed & MASK;
    state = initialSeed;
    cycle = 0;
    renderState();
  });

  randomSeedBtn.addEventListener("click", () => {
    const rnd = (Math.floor(Math.random() * MASK) + 1) & MASK; // avoid 0
    seedInput.value = "0x" + rnd.toString(16).toUpperCase();
    applySeedBtn.click();
  });

  resetBtn.addEventListener("click", () => {
    stopPlaying();
    state = initialSeed;
    cycle = 0;
    renderState();
  });

  // Initial
  renderState();
})();
