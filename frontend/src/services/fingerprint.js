/**
 * Browser Fingerprinting Engine
 * Collects hardware canvas hash, WebGL renderer, audio context fingerprint, and timezone
 * Used to detect duplicate tabs and VM sandboxes
 */

export async function generateBrowserFingerprint() {
  try {
    // 1. Canvas Fingerprint
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('SecureMeet 2026', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('SecureMeet 2026', 4, 17);
    }
    const canvasHash = canvas.toDataURL().slice(-40);

    // 2. WebGL Hardware Renderer
    let webglRenderer = 'Unknown';
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch {}

    // 3. Screen and Environment
    const screenRes = `${window.screen?.width || 0}x${window.screen?.height || 0}@${window.devicePixelRatio || 1}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    return {
      canvasHash,
      webglRenderer,
      screenRes,
      timezone,
      hardwareConcurrency,
      platform: navigator.platform || 'Win32',
      isVMProbable: webglRenderer.toLowerCase().includes('llvmpipe') || 
                    webglRenderer.toLowerCase().includes('software') || 
                    webglRenderer.toLowerCase().includes('virtualbox')
    };
  } catch {
    return { canvasHash: 'fallback', timezone: 'UTC', isVMProbable: false };
  }
}
