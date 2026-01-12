// script.js — Discrete Time Signal Visualizer
(() => {
  // Elements
  const canvas = document.getElementById("signalCanvas");
  const ctx = canvas ? canvas.getContext("2d") : null;

  const nRange = document.getElementById("nRange");
  const fsRange = document.getElementById("fsRange");
  
  const nValue = document.getElementById("nValue");
  const fsValue = document.getElementById("fsValue");
  
  const resetBtn = document.getElementById("resetBtn");

  // Guard: check all required elements exist
  const required = [canvas, ctx, nRange, fsRange, nValue, fsValue, resetBtn];
  if (required.some((x) => !x)) {
    console.warn("[discrete-signal] Missing required DOM elements.");
    return;
  }

  // Default values
  const DEFAULT_N = 50;
  const DEFAULT_FS = 1.0;
  const amplitude = 1.0; // Fixed amplitude

  let maxN = DEFAULT_N;
  let fs = DEFAULT_FS;

  // Generate discrete signal samples
  function generateSignal(nSamples, samplingFreq, amp) {
    const samples = [];
    // Create a simple sinusoidal signal at a frequency relative to Fs
    const signalFreq = samplingFreq * 0.1; // Signal frequency is 10% of sampling frequency
    
    for (let n = 0; n <= nSamples; n++) {
      // Calculate time for this sample
      const t = n / samplingFreq;
      // Generate sinusoid with the specified amplitude
      const value = amp * Math.sin(2 * Math.PI * signalFreq * t);
      samples.push({ n, value });
    }
    
    return samples;
  }

  // Draw the signal on canvas
  function drawSignal() {
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set up drawing style
    ctx.fillStyle = 'rgba(17, 17, 17, 0.92)';
    ctx.strokeStyle = 'rgba(45, 92, 140, 1)';
    ctx.lineWidth = 2;
    
    // Margins
    const marginLeft = 60;
    const marginRight = 40;
    const marginTop = 40;
    const marginBottom = 60;
    
    const plotWidth = width - marginLeft - marginRight;
    const plotHeight = height - marginTop - marginBottom;
    
    // Draw axes
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(17, 17, 17, 0.62)';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.moveTo(marginLeft, marginTop + plotHeight / 2);
    ctx.lineTo(marginLeft + plotWidth, marginTop + plotHeight / 2);
    
    // Y-axis
    ctx.moveTo(marginLeft, marginTop);
    ctx.lineTo(marginLeft, marginTop + plotHeight);
    ctx.stroke();
    
    // Draw labels
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(17, 17, 17, 0.92)';
    ctx.textAlign = 'center';
    
    // Title
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('Discrete Time Signal', width / 2, 20);
    
    // X-axis label
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText('n', width / 2, height - 20);
    
    // Y-axis label
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Amplitude', 0, 0);
    ctx.restore();
    
    // Generate and draw signal
    const samples = generateSignal(maxN, fs, amplitude);
    
    // Draw stems and dots
    ctx.strokeStyle = 'rgba(45, 92, 140, 1)';
    ctx.fillStyle = 'rgba(45, 92, 140, 1)';
    ctx.lineWidth = 2;
    
    const xScale = plotWidth / maxN;
    const yScale = plotHeight / (2 * amplitude * 1.2); // Scale with some padding
    const centerY = marginTop + plotHeight / 2;
    
    samples.forEach(({ n, value }) => {
      const x = marginLeft + n * xScale;
      const y = centerY - value * yScale;
      
      // Draw stem
      ctx.beginPath();
      ctx.moveTo(x, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
      
      // Draw dot
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Draw tick marks and labels on x-axis
    ctx.fillStyle = 'rgba(17, 17, 17, 0.62)';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    
    const numTicks = Math.min(10, maxN);
    const tickStep = Math.floor(maxN / numTicks);
    
    for (let i = 0; i <= maxN; i += tickStep) {
      const x = marginLeft + i * xScale;
      
      // Tick mark
      ctx.beginPath();
      ctx.moveTo(x, centerY);
      ctx.lineTo(x, centerY + 5);
      ctx.stroke();
      
      // Label
      if (i === 0 || i === maxN || i % (tickStep * 2) === 0) {
        ctx.fillText(i.toString(), x, centerY + 20);
      }
    }
    
    // Draw tick marks and labels on y-axis
    ctx.textAlign = 'right';
    const yTicks = [-amplitude, 0, amplitude];
    
    yTicks.forEach((val) => {
      const y = centerY - val * yScale;
      
      // Tick mark
      ctx.beginPath();
      ctx.moveTo(marginLeft - 5, y);
      ctx.lineTo(marginLeft, y);
      ctx.stroke();
      
      // Label
      ctx.fillText(val.toFixed(1), marginLeft - 10, y + 4);
    });
  }

  // Update display values
  function updateDisplayValues() {
    nValue.textContent = `0 to ${maxN}`;
    fsValue.textContent = `${fs.toFixed(1)} Hz`;
  }

  // Event handlers
  nRange.addEventListener('input', () => {
    maxN = parseInt(nRange.value, 10);
    updateDisplayValues();
    drawSignal();
  });

  fsRange.addEventListener('input', () => {
    fs = parseFloat(fsRange.value);
    updateDisplayValues();
    drawSignal();
  });

  resetBtn.addEventListener('click', () => {
    nRange.value = DEFAULT_N;
    fsRange.value = DEFAULT_FS;
    
    maxN = DEFAULT_N;
    fs = DEFAULT_FS;
    
    updateDisplayValues();
    drawSignal();
  });

  // Initial render
  updateDisplayValues();
  drawSignal();
})();
