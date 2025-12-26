let ctx;
let osc;

document.getElementById("Play").addEventListener("click", async () => {
    if (!ctx) {
        ctx = new AudioContext();
        osc = ctx.createOscillator();
        osc.frequency.value = 220;
        osc.connect(ctx.destination);
        osc.start;
    }
    await ctx.resume();
});

document.getElementById("Stop").addEventListener("click", () => {
    if (osc) {
        osc.stop();
        osc = null;
    }
});