import html2canvas from "html2canvas";

// Capture the learner's live rendered preview (the same-document `.preview-host`
// div — no iframe, so this is same-origin and safe) as a PNG. Returns the full
// data URL; call `stripDataUrlPrefix` before POSTing the raw base64 to the API.
//
// Read the DOM at call time (button click), not on every render: html2canvas
// snapshots whatever is currently on screen.
export async function capturePreviewScreenshot(): Promise<string> {
  const host = document.querySelector<HTMLElement>(".preview-host");
  if (!host) {
    throw new Error("Nothing to capture — render your preview first.");
  }
  const canvas = await html2canvas(host, {
    backgroundColor: "#ffffff",
    logging: false,
    // Cap the pixel ratio so a HiDPI capture doesn't balloon past the API's ~5MB
    // body cap; 2x keeps text crisp for the vision model without going huge.
    scale: Math.min(window.devicePixelRatio || 1, 2),
  });
  return canvas.toDataURL("image/png");
}

// Strip the `data:image/png;base64,` prefix, leaving raw base64 for the API body.
export function stripDataUrlPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}
