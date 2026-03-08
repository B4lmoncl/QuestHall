const API_BASE = 'http://187.77.139.247:3001';
const API_KEY  = '133e6c2602b0fd62e64de00779d44093';

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
