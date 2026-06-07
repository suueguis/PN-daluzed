import '@testing-library/jest-dom';

// ResizeObserver is used by Recharts' ResponsiveContainer but not available in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
