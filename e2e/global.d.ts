// e2e 探针的全局类型（仅测试注入）。
export {};

declare global {
  interface Window {
    __audio?: { contexts: number; oscillators: number };
    __audioProbe?: { contexts: number };
  }
}
