/// <reference types="vite/client" />

declare module '*.mjs?worker' {
  const workerConstructor: {
    new (options?: { name?: string }): Worker;
  };
  export default workerConstructor;
}
