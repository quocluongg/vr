import { createXRStore } from "@react-three/xr";

// Configure WebXR store with hand tracking and controller support
export const xrStore = createXRStore({
  offerSession: "immersive-vr",
  controller: true,
  hand: {
    left: true,
    right: true,
  },
});
