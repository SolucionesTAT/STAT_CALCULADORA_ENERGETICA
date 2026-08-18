import { getSettings, saveSettings, applyTheme } from '../js/storage.js';

const settings = getSettings();

const themeSwitch = document.getElementById('theme-switch');
[...themeSwitch.querySelectorAll('button')].forEach(b => {
  b.classList.toggle('active', b.dataset.theme === settings.theme);
});
themeSwitch.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-theme]');
  if(!btn) return;
  saveSettings({ theme: btn.dataset.theme });
  applyTheme();
  [...themeSwitch.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === btn));
});

const decimalsSwitch = document.getElementById('decimals-switch');
[...decimalsSwitch.querySelectorAll('button')].forEach(b => {
  b.classList.toggle('active', Number(b.dataset.decimals) === settings.decimals);
});
decimalsSwitch.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-decimals]');
  if(!btn) return;
  saveSettings({ decimals: Number(btn.dataset.decimals) });
  [...decimalsSwitch.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === btn));
});

const technicianInput = document.getElementById('technician-input');
technicianInput.value = settings.technician || '';
technicianInput.addEventListener('change', () => {
  saveSettings({ technician: technicianInput.value.trim() });
});
