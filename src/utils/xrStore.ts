import { createXRStore } from "@react-three/xr";

// Configure WebXR store for Meta Quest immersive-vr
// layers: false disables XRWebGLBinding compositor layers which cause passthrough on Quest
// Disabling unused optional features simplifies session init and prevents silent failures
export const xrStore = createXRStore({
  offerSession: "immersive-vr",
  layers: false,
  anchors: false,
  hitTest: false,
  meshDetection: false,
  planeDetection: false,
  controller: true,
  hand: {
    left: true,
    right: true,
  },
});
