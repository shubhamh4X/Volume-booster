import JSZip from 'jszip';

export interface ExtensionFile {
  name: string;
  path: string;
  type: 'json' | 'javascript' | 'html' | 'css' | 'markdown';
  content: string;
}

export const EXTENSION_MANIFEST = {
  manifest_version: 3,
  name: 'Volume Booster - Up to 600%',
  version: '1.0.0',
  description: 'Boost audio volume up to 600% on any tab, video, YouTube, Netflix, Spotify, or podcast.',
  permissions: ['activeTab', 'scripting', 'storage', 'tabCapture'],
  action: {
    default_popup: 'popup.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  background: {
    service_worker: 'background.js',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['content.js'],
      run_at: 'document_start',
      all_frames: true,
    },
  ],
  commands: {
    'increase-volume': {
      suggested_key: {
        default: 'Alt+Up',
      },
      description: 'Increase volume by 10%',
    },
    'decrease-volume': {
      suggested_key: {
        default: 'Alt+Down',
      },
      description: 'Decrease volume by 10%',
    },
    'toggle-mute': {
      suggested_key: {
        default: 'Alt+M',
      },
      description: 'Mute / Unmute current tab',
    },
    'max-boost': {
      suggested_key: {
        default: 'Alt+B',
      },
      description: 'Max volume boost (600%)',
    },
  },
};

export const CONTENT_SCRIPT_JS = `/**
 * Volume Booster Content Script
 * Intercepts HTMLMediaElements (<audio>, <video>) on any webpage
 * and routes them through Web Audio GainNode & DynamicsCompressor.
 */
(() => {
  let audioCtx = null;
  let userHasInteracted = false;
  const connectedMedia = new WeakSet();
  const mediaNodes = [];

  let currentSettings = {
    volume: 100, // 0 to 600
    bass: 0,     // 0 to 100
    limiter: true,
    isMuted: false
  };

  function hasUserGesture() {
    if (typeof navigator !== 'undefined' && navigator.userActivation) {
      return Boolean(navigator.userActivation.hasBeenActive);
    }
    return userHasInteracted;
  }

  function safeResumeAudioContext() {
    if (!audioCtx || audioCtx.state !== 'suspended') return;
    // Chromium logs an error directly to the extension console if resume() is called
    // while navigator.userActivation.hasBeenActive is false. Only resume when a gesture exists.
    if (!hasUserGesture()) {
      return;
    }
    audioCtx.resume().catch(() => {});
  }

  // Register passive user interaction handlers to cleanly unlock Web Audio
  const unlockEvents = ['click', 'keydown', 'pointerdown', 'touchstart'];
  const onFirstInteraction = () => {
    userHasInteracted = true;
    safeResumeAudioContext();
    unlockEvents.forEach(evt => {
      document.removeEventListener(evt, onFirstInteraction, true);
    });
  };
  unlockEvents.forEach(evt => {
    document.addEventListener(evt, onFirstInteraction, { capture: true, passive: true });
  });

  function getAudioContext(forceResume = false) {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioCtx = new AudioCtx();
    }
    if (forceResume || userHasInteracted) {
      safeResumeAudioContext();
    }
    return audioCtx;
  }

  function attachBoosterToMedia(mediaElement) {
    if (connectedMedia.has(mediaElement)) return;
    try {
      const ctx = getAudioContext(false);
      if (!ctx) return;
      const source = ctx.createMediaElementSource(mediaElement);

      // Bass boost filter
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 120;
      bassFilter.gain.value = (currentSettings.bass / 100) * 15;

      // Master Gain (allows up to 600%)
      const gainNode = ctx.createGain();
      gainNode.gain.value = currentSettings.isMuted ? 0 : (currentSettings.volume / 100);

      // Soft Limiter to stop harsh digital clipping
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = currentSettings.limiter ? -3.0 : 0;
      compressor.ratio.value = currentSettings.limiter ? 16.0 : 1.0;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.15;

      // Routing
      source.connect(bassFilter);
      bassFilter.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(ctx.destination);

      connectedMedia.add(mediaElement);
      mediaNodes.push({ mediaElement, bassFilter, gainNode, compressor });

      // Automatically resume audio context when playback starts or resumes
      mediaElement.addEventListener('play', safeResumeAudioContext, { passive: true });
      mediaElement.addEventListener('playing', safeResumeAudioContext, { passive: true });
    } catch (err) {
      // If CORS blocks MediaElementAudioSourceNode on cross-origin stream,
      // fallback to standard element.volume multiplier where possible.
      console.debug('[Volume Booster] Direct audio graph notice:', err);
    }
  }

  function applySettingsToAll() {
    safeResumeAudioContext();
    const targetGain = currentSettings.isMuted ? 0 : (currentSettings.volume / 100);
    const bassGainDb = (currentSettings.bass / 100) * 15;

    for (const item of mediaNodes) {
      if (item.gainNode && audioCtx) {
        const now = audioCtx.currentTime;
        item.gainNode.gain.cancelScheduledValues(now);
        item.gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.05);

        item.bassFilter.gain.cancelScheduledValues(now);
        item.bassFilter.gain.linearRampToValueAtTime(bassGainDb, now + 0.05);

        if (currentSettings.limiter) {
          item.compressor.threshold.setValueAtTime(-3.0, now);
          item.compressor.ratio.setValueAtTime(16.0, now);
        } else {
          item.compressor.threshold.setValueAtTime(0, now);
          item.compressor.ratio.setValueAtTime(1.0, now);
        }
      }
    }
  }

  function scanExistingMedia() {
    const elements = document.querySelectorAll('audio, video');
    elements.forEach(attachBoosterToMedia);
  }

  // Hook new media created on dynamic sites like YouTube, Spotify, Netflix
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          if (node.matches('audio, video')) attachBoosterToMedia(node);
          node.querySelectorAll?.('audio, video')?.forEach(attachBoosterToMedia);
        }
      });
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Listen on play event
  document.addEventListener('play', (e) => {
    if (e.target && (e.target.tagName === 'AUDIO' || e.target.tagName === 'VIDEO')) {
      getAudioContext(true);
      attachBoosterToMedia(e.target);
      applySettingsToAll();
    }
  }, true);

  // Chrome Extension message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    safeResumeAudioContext();
    if (request.action === 'getVolumeState') {
      sendResponse({ status: 'ok', settings: currentSettings });
    } else if (request.action === 'setVolume') {
      currentSettings.volume = Math.max(0, Math.min(600, request.volume ?? currentSettings.volume));
      if (request.bass !== undefined) currentSettings.bass = request.bass;
      if (request.limiter !== undefined) currentSettings.limiter = request.limiter;
      if (request.isMuted !== undefined) currentSettings.isMuted = request.isMuted;

      scanExistingMedia();
      applySettingsToAll();
      sendResponse({ status: 'ok', settings: currentSettings });
    }
    return true;
  });

  scanExistingMedia();
})();
`;

export const BACKGROUND_JS = `/**
 * Volume Booster Service Worker (Manifest V3)
 * Manages per-tab state, badge text, and keyboard shortcuts.
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('Volume Booster installed successfully.');
});

// Update badge icon text with current boost
function updateBadge(tabId, volume, isMuted) {
  if (!tabId) return;
  if (isMuted) {
    chrome.action.setBadgeText({ tabId, text: 'MUTE' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#18181b' });
    return;
  }
  if (volume > 100) {
    chrome.action.setBadgeText({ tabId, text: \`\${volume}%\` });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#09090b' });
  } else {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
}

// Global keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const key = \`tab_\${tab.id}\`;
  const storage = await chrome.storage.local.get([key]);
  const current = storage[key] || { volume: 100, bass: 0, limiter: true, isMuted: false };

  if (command === 'increase-volume') {
    current.volume = Math.min(600, current.volume + 10);
    current.isMuted = false;
  } else if (command === 'decrease-volume') {
    current.volume = Math.max(0, current.volume - 10);
  } else if (command === 'toggle-mute') {
    current.isMuted = !current.isMuted;
  } else if (command === 'max-boost') {
    current.volume = 600;
    current.isMuted = false;
  }

  await chrome.storage.local.set({ [key]: current });
  updateBadge(tab.id, current.volume, current.isMuted);

  try {
    chrome.tabs.sendMessage(tab.id, { action: 'setVolume', ...current });
  } catch (err) {
    console.debug('Tab not ready for injection:', err);
  }
});
`;

export const POPUP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Volume Booster</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="header">
      <div class="brand">
        <svg class="icon-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
        <span class="title">Volume Booster</span>
      </div>
      <span id="tabBadge" class="badge">ACTIVE TAB</span>
    </header>

    <div class="meter-wrapper">
      <div class="volume-dial-container">
        <svg class="dial-svg" viewBox="0 0 120 120">
          <circle class="dial-track" cx="60" cy="60" r="50"></circle>
          <circle id="dialProgress" class="dial-fill" cx="60" cy="60" r="50"></circle>
        </svg>
        <div class="dial-content">
          <span id="volumeValue" class="dial-number">100%</span>
          <span id="boostLabel" class="dial-label">NORMAL</span>
        </div>
      </div>
    </div>

    <!-- Volume Slider (0 - 600%) -->
    <div class="control-row">
      <label for="volumeSlider">Master Volume (up to 600%)</label>
      <input type="range" id="volumeSlider" min="0" max="600" step="5" value="100">
    </div>

    <!-- Quick Boost Presets -->
    <div class="pill-group">
      <button class="pill" data-boost="100">100%</button>
      <button class="pill" data-boost="200">200%</button>
      <button class="pill" data-boost="300">300%</button>
      <button class="pill" data-boost="450">450%</button>
      <button class="pill highlight" data-boost="600">MAX (600%)</button>
    </div>

    <!-- Bass Boost -->
    <div class="control-row">
      <div class="row-label">
        <label for="bassSlider">Bass Enhancer</label>
        <span id="bassValue">0%</span>
      </div>
      <input type="range" id="bassSlider" min="0" max="100" step="5" value="0">
    </div>

    <!-- Action Toggles -->
    <div class="toggles-grid">
      <label class="toggle-card">
        <input type="checkbox" id="limiterToggle" checked>
        <span class="toggle-title">Anti-Distortion Limiter</span>
        <span class="toggle-desc">Prevents harsh clipping</span>
      </label>
      <button id="muteBtn" class="mute-button">
        <span id="muteText">Mute Audio</span>
      </button>
    </div>

    <footer class="footer">
      <span>Shortcuts: Alt+Up / Alt+Down / Alt+B</span>
    </footer>
  </div>

  <script src="popup.js"></script>
</body>
</html>
`;

export const POPUP_CSS = `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  width: 340px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #09090b;
  color: #f4f4f5;
  padding: 16px;
  user-select: none;
}
.popup-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #27272a;
  padding-bottom: 10px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon-brand {
  width: 20px;
  height: 20px;
  color: #ffffff;
}
.title {
  font-weight: 800;
  font-size: 14px;
  letter-spacing: -0.02em;
  color: #ffffff;
}
.badge {
  font-size: 10px;
  background: #18181b;
  color: #d4d4d8;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
  border: 1px solid #27272a;
  font-family: monospace;
}
.meter-wrapper {
  display: flex;
  justify-content: center;
  padding: 6px 0;
}
.volume-dial-container {
  position: relative;
  width: 130px;
  height: 130px;
}
.dial-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.dial-track {
  fill: none;
  stroke: #27272a;
  stroke-width: 8;
}
.dial-fill {
  fill: none;
  stroke: #ffffff;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 314;
  stroke-dashoffset: 260;
  transition: stroke-dashoffset 0.15s ease;
}
.dial-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.dial-number {
  font-size: 28px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: -0.03em;
}
.dial-label {
  font-size: 10px;
  font-weight: 800;
  color: #a1a1aa;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: monospace;
}
.control-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.control-row label {
  font-size: 11px;
  color: #a1a1aa;
  font-weight: 600;
}
.row-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #a1a1aa;
  font-weight: 600;
}
input[type=range] {
  appearance: none;
  width: 100%;
  height: 6px;
  background: #27272a;
  border-radius: 9999px;
  outline: none;
}
input[type=range]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #ffffff;
  border: 1px solid #71717a;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.5);
}
.pill-group {
  display: flex;
  gap: 6px;
}
.pill {
  flex: 1;
  background: #18181b;
  border: 1px solid #27272a;
  color: #d4d4d8;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: monospace;
}
.pill:hover {
  background: #27272a;
  color: #ffffff;
  border-color: #52525b;
}
.pill.highlight {
  background: #ffffff;
  border-color: #ffffff;
  color: #000000;
  font-weight: 900;
}
.pill.highlight:hover {
  background: #e4e4e7;
  color: #000000;
}
.toggles-grid {
  display: flex;
  gap: 8px;
}
.toggle-card {
  flex: 2;
  background: #18181b;
  border: 1px solid #27272a;
  padding: 8px 10px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}
.toggle-title {
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
}
.toggle-desc {
  font-size: 9px;
  color: #a1a1aa;
}
.mute-button {
  flex: 1;
  background: #18181b;
  border: 1px solid #27272a;
  color: #ffffff;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.mute-button:hover {
  border-color: #52525b;
}
.mute-button.muted {
  background: #ffffff;
  color: #000000;
  border-color: #ffffff;
}
.footer {
  text-align: center;
  font-size: 10px;
  color: #71717a;
  padding-top: 4px;
  font-family: monospace;
}
`;

export const POPUP_JS = `/**
 * Volume Booster Popup Script
 */
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  const boostLabel = document.getElementById('boostLabel');
  const dialProgress = document.getElementById('dialProgress');
  const bassSlider = document.getElementById('bassSlider');
  const bassValue = document.getElementById('bassValue');
  const limiterToggle = document.getElementById('limiterToggle');
  const muteBtn = document.getElementById('muteBtn');
  const muteText = document.getElementById('muteText');

  const key = tab?.id ? \`tab_\${tab.id}\` : 'default_tab';
  const data = await chrome.storage.local.get([key]);
  let state = data[key] || { volume: 100, bass: 0, limiter: true, isMuted: false };

  function renderUI() {
    volumeSlider.value = state.volume;
    volumeValue.textContent = state.isMuted ? 'MUTED' : \`\${state.volume}%\`;
    bassSlider.value = state.bass;
    bassValue.textContent = \`\${state.bass}%\`;
    limiterToggle.checked = state.limiter;

    if (state.isMuted) {
      muteBtn.classList.add('muted');
      muteText.textContent = 'Unmute';
      boostLabel.textContent = 'MUTED';
      dialProgress.style.stroke = '#52525b';
    } else {
      muteBtn.classList.remove('muted');
      muteText.textContent = 'Mute Audio';
      dialProgress.style.stroke = '#ffffff';
      if (state.volume > 450) {
        boostLabel.textContent = 'MAX 6.0x GAIN';
      } else if (state.volume > 200) {
        boostLabel.textContent = 'HIGH-GAIN';
      } else if (state.volume > 100) {
        boostLabel.textContent = 'BOOSTED';
      } else {
        boostLabel.textContent = 'UNITY (100%)';
      }
    }

    // Update dial SVG arc (circumference is 2 * PI * 50 = ~314)
    const maxVal = 600;
    const progress = state.isMuted ? 0 : Math.min(1, state.volume / maxVal);
    const offset = 314 - (314 * progress);
    dialProgress.style.strokeDashoffset = offset;
  }

  async function pushState() {
    await chrome.storage.local.set({ [key]: state });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'setVolume',
        volume: state.volume,
        bass: state.bass,
        limiter: state.limiter,
        isMuted: state.isMuted
      }).catch(() => {});
    }
    renderUI();
  }

  volumeSlider.addEventListener('input', (e) => {
    state.volume = parseInt(e.target.value, 10);
    state.isMuted = false;
    pushState();
  });

  bassSlider.addEventListener('input', (e) => {
    state.bass = parseInt(e.target.value, 10);
    pushState();
  });

  limiterToggle.addEventListener('change', (e) => {
    state.limiter = e.target.checked;
    pushState();
  });

  muteBtn.addEventListener('click', () => {
    state.isMuted = !state.isMuted;
    pushState();
  });

  document.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      state.volume = parseInt(btn.getAttribute('data-boost'), 10);
      state.isMuted = false;
      pushState();
    });
  });

  renderUI();
});
`;

export const BOOKMARKLET_CODE = `javascript:(function(){
  if (window.__volBoosterLoaded) {
    var v = prompt("Volume Booster (0 - 600%):", "300");
    if (v !== null) window.__setVolBoost(parseInt(v, 10));
    return;
  }
  window.__volBoosterLoaded = true;
  var ctx = new (window.AudioContext || window.webkitAudioContext)();
  var media = Array.from(document.querySelectorAll('audio, video'));
  if (!media.length) {
    alert("Volume Booster: No <audio> or <video> element found on this page.");
    return;
  }
  var gainNodes = [];
  media.forEach(function(el) {
    try {
      var src = ctx.createMediaElementSource(el);
      var gain = ctx.createGain();
      gain.gain.value = 3.0; // 300% default boost
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -3;
      comp.ratio.value = 16;
      src.connect(gain);
      gain.connect(comp);
      comp.connect(ctx.destination);
      gainNodes.push(gain);
    } catch(e){}
  });
  window.__setVolBoost = function(pct) {
    var factor = Math.max(0, Math.min(600, pct)) / 100;
    gainNodes.forEach(function(g) { g.gain.value = factor; });
  };
  alert("Volume Booster active! Boosted to 300%. Click bookmarklet again anytime to change percentage.");
})();`;

export const EXTENSION_FILES: ExtensionFile[] = [
  {
    name: 'manifest.json',
    path: 'manifest.json',
    type: 'json',
    content: JSON.stringify(EXTENSION_MANIFEST, null, 2),
  },
  {
    name: 'content.js',
    path: 'content.js',
    type: 'javascript',
    content: CONTENT_SCRIPT_JS,
  },
  {
    name: 'background.js',
    path: 'background.js',
    type: 'javascript',
    content: BACKGROUND_JS,
  },
  {
    name: 'popup.html',
    path: 'popup.html',
    type: 'html',
    content: POPUP_HTML,
  },
  {
    name: 'popup.css',
    path: 'popup.css',
    type: 'css',
    content: POPUP_CSS,
  },
  {
    name: 'popup.js',
    path: 'popup.js',
    type: 'javascript',
    content: POPUP_JS,
  },
  {
    name: 'README.md',
    path: 'README.md',
    type: 'markdown',
    content: `# Volume Booster Chrome Extension (Manifest V3)

Boost audio levels up to 600% on any webpage including YouTube, Netflix, Spotify Web, Podcasts, Twitch, and Vimeo!

## How to Install in Google Chrome

1. Download and extract the **volume-booster-chrome-extension.zip** archive.
2. Open Google Chrome and navigate to \`chrome://extensions\`.
3. In the top-right corner of the Extensions page, enable **"Developer mode"**.
4. Click the **"Load unpacked"** button in the top-left toolbar.
5. Select the extracted folder containing \`manifest.json\`.
6. Click the extension puzzle piece icon in Chrome, pin **Volume Booster**, and enjoy boosting any audio up to 600%!

## Keyboard Shortcuts
- **Alt + Up**: Increase volume (+10%)
- **Alt + Down**: Decrease volume (-10%)
- **Alt + M**: Toggle tab mute
- **Alt + B**: Instant 600% MAX Boost

## Features
- Web Audio API Gain Node with up to 600% boost (6.0x multiplier)
- Soft-knee Dynamic Compressor Limiter preventing digital distortion & audio crackle
- Bass Enhancer (low-shelf 120Hz filter)
- Tab-isolated volume memory
`,
  },
];

/**
 * Generate extension icons as PNG Data URIs using Canvas
 */
function createExtensionIconCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Dark sleek background circle
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#0284c7');
  grad.addColorStop(1, '#0369a1');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Draw volume speaker icon
  ctx.fillStyle = '#ffffff';
  const scale = size / 24;

  // Speaker body
  ctx.beginPath();
  ctx.moveTo(7 * scale, 9 * scale);
  ctx.lineTo(4 * scale, 9 * scale);
  ctx.lineTo(4 * scale, 15 * scale);
  ctx.lineTo(7 * scale, 15 * scale);
  ctx.lineTo(12 * scale, 19 * scale);
  ctx.lineTo(12 * scale, 5 * scale);
  ctx.closePath();
  ctx.fill();

  // Boost soundwave arcs
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(12 * scale, 12 * scale, 4 * scale, -Math.PI / 4, Math.PI / 4);
  ctx.stroke();

  ctx.strokeStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(12 * scale, 12 * scale, 7.5 * scale, -Math.PI / 3, Math.PI / 3);
  ctx.stroke();

  return canvas;
}

export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();

  // Add text files
  for (const file of EXTENSION_FILES) {
    zip.file(file.path, file.content);
  }

  // Add generated icon PNGs
  const iconsFolder = zip.folder('icons');
  if (iconsFolder) {
    const sizes = [16, 48, 128];
    for (const s of sizes) {
      const canvas = createExtensionIconCanvas(s);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (blob) {
        const arrayBuffer = await blob.arrayBuffer();
        iconsFolder.file(`icon${s}.png`, arrayBuffer);
      }
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipContent);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'volume-booster-chrome-extension.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
