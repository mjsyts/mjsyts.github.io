let ctx;
let osc;

document.getElementById("play").addEventListener("click", async () => {
    if (!ctx) {
        ctx = new AudioContext();
        osc = ctx.createOscillator();
        osc.frequency.value = 220;
        osc.connect(ctx.destination);
        osc.start;
    }
    await ctx.resume();
});

document.getElementById("stop").addEventListener("click", () => {
    if (osc) {
        osc.stop();
        osc = null;
    }
})