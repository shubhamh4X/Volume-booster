/**
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

  function safeResumeAudioContext() {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {
        // Ignored: browser autoplay policy will resume on next user gesture
      });
    }
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
      // Cross-origin restriction or already hooked notice
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
