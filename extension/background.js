/**
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
    chrome.action.setBadgeText({ tabId, text: `${volume}%` });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#09090b' });
  } else {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
}

// Global keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const key = `tab_${tab.id}`;
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
