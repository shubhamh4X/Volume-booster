/**
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

  const key = tab?.id ? `tab_${tab.id}` : 'default_tab';
  const data = await chrome.storage.local.get([key]);
  let state = data[key] || { volume: 100, bass: 0, limiter: true, isMuted: false };

  function renderUI() {
    volumeSlider.value = state.volume;
    volumeValue.textContent = state.isMuted ? 'MUTED' : `${state.volume}%`;
    bassSlider.value = state.bass;
    bassValue.textContent = `${state.bass}%`;
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
