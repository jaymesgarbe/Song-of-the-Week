// Evaluated once per build (and once per dev-server start), so every page in
// the same deploy shares it.
export const BUILD_TIME = String(Date.now());
