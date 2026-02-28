// Dynamic CDN loader for CesiumJS — avoids webpack bundling issues
const CESIUM_VERSION = '1.119';
const BASE = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VERSION}/Build/Cesium`;

let promise: Promise<any> | null = null;

export function loadCesium(): Promise<any> {
  if (promise) return promise;

  promise = new Promise<any>((resolve, reject) => {
    if ((window as any).Cesium) {
      resolve((window as any).Cesium);
      return;
    }

    // Workers need to know the base URL
    (window as any).CESIUM_BASE_URL = BASE;

    // Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${BASE}/Widgets/widgets.css`;
    document.head.appendChild(link);

    // Inject JS
    const script = document.createElement('script');
    script.src = `${BASE}/Cesium.js`;
    script.onload = () => {
      const C = (window as any).Cesium;
      if (C) resolve(C);
      else reject(new Error('Cesium failed to initialize'));
    };
    script.onerror = () => reject(new Error('Failed to load Cesium from CDN'));
    document.head.appendChild(script);
  });

  return promise;
}
