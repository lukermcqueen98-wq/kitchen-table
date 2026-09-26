// Stand-in for transformers.js: "embeds" an image as its mean-centered 16x12 RGB thumbnail
export const env = {};
export async function pipeline(task, model, opts){
  if (task === "automatic-speech-recognition") {
    window.__asr = { model, opts, calls:0, secs:0 };
    return async audio => { window.__asr.calls++; window.__asr.secs += audio.length / 16000; return { text:" I cast Sol Ring. [BLANK_AUDIO]" }; };
  }
  window.__tjs = { task, model, opts, calls:0 };
  return async canvases => {
    window.__tjs.calls++;
    const D = 16 * 12 * 3, out = new Float32Array(canvases.length * D);
    canvases.forEach((c, i) => {
      const t = document.createElement("canvas"); t.width = 16; t.height = 12;
      const x = t.getContext("2d"); x.drawImage(c, 0, 0, 16, 12);
      const d = x.getImageData(0, 0, 16, 12).data; let m = 0;
      for (let k = 0; k < 192; k++) for (let ch = 0; ch < 3; ch++) m += d[k * 4 + ch];
      m /= D;
      for (let k = 0; k < 192; k++) for (let ch = 0; ch < 3; ch++) out[i * D + k * 3 + ch] = d[k * 4 + ch] - m;
    });
    return { data:out, dims:[canvases.length, 1, D] };
  };
}
