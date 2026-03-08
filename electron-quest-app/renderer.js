const { existsSync, readFileSync } = require('fs');
const path = require('path');

let API_BASE = 'http://localhost:3001';
let API_KEY  = '';

try {
  const configPath = path.join(__dirname, '.quest-config.json');
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    if (config.API_BASE) API_BASE = config.API_BASE;
    if (config.API_KEY)  API_KEY  = config.API_KEY;
  } else {
    console.warn('[config] .quest-config.json not found — copy .quest-config.json.example and fill in your details');
  }
} catch (e) {
  console.error('[config] Failed to load .quest-config.json:', e.message);
}

const form      = document.getElementById('quest-form');
const submitBtn = document.getElementById('submit-btn');
const msgEl     = document.getElementById('message');

function showMessage(text, isError = false) {
  msgEl.textContent = text;
  msgEl.className = 'message ' + (isError ? 'error' : 'success');
  setTimeout(() => {
    msgEl.className = 'message hidden';
  }, 4000);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title       = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const priority    = document.getElementById('priority').value;
  const category    = document.getElementById('category').value || undefined;

  if (!title) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting…';

  try {
    const resp = await fetch(`${API_BASE}/api/quest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ title, description, priority, category }),
    });

    if (resp.ok) {
      const data = await resp.json();
      showMessage(`Quest posted! ID: ${data.quest.id}`);
      form.reset();
      document.getElementById('priority').value = 'medium';
      document.getElementById('category').value = '';
    } else {
      const err = await resp.json().catch(() => ({}));
      showMessage(`Error ${resp.status}: ${err.error || resp.statusText}`, true);
    }
  } catch (err) {
    showMessage(`Network error: ${err.message}`, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Quest Posten';
  }
});
