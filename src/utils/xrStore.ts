import { createXRStore } from "@react-three/xr";

// Configure WebXR store with hand tracking and controller support
export const xrStore = createXRStore({
  controller: true,
  hand: {
    left: true,
    right: true,
  },
});
