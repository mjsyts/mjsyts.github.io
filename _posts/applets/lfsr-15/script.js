// script.js — 15-bit LFSR Visualizer
(function () {
  const N_BITS = 15;
  const MSB_INDEX = N_BITS - 1; // 14
  const MASK = (1 << N_BITS) - 1; // 0x7FFF

  // Elements
  const registerEl = document.getElementById("register");
  const bubbleEl = document.getElementById("xorBubble");
  const vizEl = document.getElementById("viz");

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

  let state = 0x7fff; // default seed
  let initialSeed = state;
  let cycle = 0;
  let playing = false;

  // Build cells (left-to-right: MSB=14 ... LSB=0)
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

  function toBinaryString(x) {
    return x.toString(2).padStart(N_BITS, "0");
  }

  function toHexString(x) {
    return "0x" + x.toString(16).toUpperCase().padStart(4, "0");
  }

  function renderState() {
    const bin = toBinaryString(state);
    // Update cells: cells[0] corresponds to bit 14, cells[14] to bit 0
    for (let uiIdx = 0; uiIdx < cells.length; uiIdx++) {
      const logicalBitIndex = MSB_INDEX - uiIdx; // map UI index to logical bit index
      const bitVal = (state >> logicalBitIndex) & 1;
      cells[uiIdx].querySelector(".value").textContent = String(bitVal);
      cells[uiIdx].classList.remove("just-updated");
    }

    cycleOut.textContent = String(cycle);
    binOut.textContent = bin;
    hexOut.textContent = toHexString(state);
    decOut.textContent = String(state);
  }

  function parseSeed(inputStr) {
    const s = inputStr.trim().toLowerCase();
    let value = null;
    if (s.startsWith("0x")) {
      // hex
      value = parseInt(s.slice(2), 16);
    } else if (/^[01]+$/.test(s)) {
      // binary string
      value = parseInt(s, 2);
    } else {
      // decimal
      value = parseInt(s, 10);
    }
    if (!Number.isFinite(value)) return null;
    // Constrain to 15 bits
    value = value & MASK;
    return value;
  }

  function highlightRMBs(msbCell, lsbCell, bit1Cell) {
    lsbCell.classList.add("rmb-active");
    bit1Cell.classList.add("rmb-active");
    msbCell.classList.add("lmb-target");
  }
  function clearHighlights() {
    cells.forEach((c) => c.classList.remove("rmb-active", "lmb-target"));
  }

  function animateBubble(lsbCell, bit1Cell, msbCell, value, speedFactor) {
    return new Promise((resolve) => {
      const regRect = registerEl.getBoundingClientRect();
      const lsbRect = lsbCell.getBoundingClientRect();
      const bit1Rect = bit1Cell.getBoundingClientRect();
      const msbRect = msbCell.getBoundingClientRect();

      const startX = (lsbRect.left + bit1Rect.right) / 2 - regRect.left; // midpoint between LSB & bit1
      const startY = Math.min(lsbRect.top, bit1Rect.top) - regRect.top - 12; // above the lower of the two
      const endX = msbRect.left + msbRect.width / 2 - regRect.left;
      const endY = msbRect.top - regRect.top - 12;

      bubbleEl.textContent = String(value);
      bubbleEl.style.transitionDuration = `${Math.round(600 / speedFactor)}ms`;
      bubbleEl.style.left = `${startX}px`;
      bubbleEl.style.top = `${startY}px`;
      bubbleEl.classList.add("on");
      // Force reflow
      void bubbleEl.offsetWidth;
      requestAnimationFrame(() => {
        bubbleEl.style.left = `${endX}px`;
        bubbleEl.style.top = `${endY}px`;
      });

      const onDone = () => {
        bubbleEl.classList.remove("on");
        bubbleEl.removeEventListener("transitionend", onDone);
        resolve();
      };
      bubbleEl.addEventListener("transitionend", onDone);
    });
  }

  async function step(animated = true) {
    const lsb = state & 1; // bit0
    const bit1 = (state >> 1) & 1; // bit1
    const newBit = lsb ^ bit1; // XOR of two RMBs

    const msbCell = cells[0]; // UI cell for bit14 (MSB)
    const bit1Cell = cells[cells.length - 2]; // UI cell for bit1
    const lsbCell = cells[cells.length - 1]; // UI cell for bit0

    clearHighlights();
    highlightRMBs(msbCell, lsbCell, bit1Cell);

    if (animated) {
      const speedFactor = parseFloat(speedRange.value || "1");
      await animateBubble(lsbCell, bit1Cell, msbCell, newBit, speedFactor);
    }

    // Perform the shift & insert
    const shifted = (state >> 1) & MASK;
    state = (shifted | (newBit << MSB_INDEX)) & MASK;
    cycle++;

    renderState();

    // Feedback
    msbCell.classList.add("just-updated");
    clearHighlights();
  }

  async function playLoop() {
    if (playing) return; // already playing
    playing = true;
    playBtn.textContent = "Pause";
    stepBtn.disabled = true;
    applySeedBtn.disabled = true;
    randomSeedBtn.disabled = true;
    resetBtn.disabled = true;

    try {
      while (playing) {
        await step(true);
        // Small pause between steps based on speed
        const speedFactor = parseFloat(speedRange.value || "1");
        const pause = Math.round(80 / speedFactor);
        await new Promise((r) => setTimeout(r, pause));
      }
    } finally {
      playBtn.textContent = "Play";
      stepBtn.disabled = false;
      applySeedBtn.disabled = false;
      randomSeedBtn.disabled = false;
      resetBtn.disabled = false;
    }
  }

  function stopPlaying() {
    playing = false;
  }

  // Event listeners
  stepBtn.addEventListener("click", () => {
    stopPlaying();
    step(true);
  });
  playBtn.addEventListener("click", () => {
    if (playing) {
      stopPlaying();
    } else {
      playLoop();
    }
  });

  applySeedBtn.addEventListener("click", () => {
    const parsed = parseSeed(seedInput.value);
    if (parsed === null || parsed < 0 || parsed > MASK) {
      alert(
        "Please enter a valid 15-bit value (binary up to 15 bits, decimal 0..32767, or hex 0x0000..0x7FFF)."
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
    const rnd = (Math.floor(Math.random() * MASK) + 1) & MASK; // avoid 0 if possible
    seedInput.value = "0x" + rnd.toString(16).toUpperCase();
    applySeedBtn.click();
  });

  resetBtn.addEventListener("click", () => {
    stopPlaying();
    state = initialSeed;
    cycle = 0;
    renderState();
  });

  // Initial paint
  renderState();
})();