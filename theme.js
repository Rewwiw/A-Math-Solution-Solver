// ══════════════════════════════════════════════════════════════
// Dark / Light Mode & Font Style Controller (with Dev Tools)
// ══════════════════════════════════════════════════════════════

// 1. Initial State Setup (Prevent FOUC)
(function initThemeAndFont() {
  const savedTheme = localStorage.getItem('amath_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);

  const savedFont = localStorage.getItem('amath_font') || 'modern';
  document.documentElement.setAttribute('data-font', savedFont);
})();

// 2. Theme Toggle (Light / Dark)
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('amath_theme', next);
  updateThemeIcons(next);
}

function updateThemeIcons(theme) {
  const current = theme || document.documentElement.getAttribute('data-theme') || 'light';
  document.querySelectorAll('.theme-icon').forEach(el => {
    el.textContent = current === 'dark' ? '☀️' : '🌙';
  });
}

// 3. Dev Tool: Font Style Toggle (Modern Tech vs Editorial Luxury)
function toggleFontTheme() {
  const current = document.documentElement.getAttribute('data-font') || 'modern';
  const next = current === 'modern' ? 'editorial' : 'modern';
  document.documentElement.setAttribute('data-font', next);
  localStorage.setItem('amath_font', next);
  updateFontLabels(next);
}

function updateFontLabels(font) {
  const current = font || document.documentElement.getAttribute('data-font') || 'modern';
  document.querySelectorAll('.font-toggle-label').forEach(el => {
    el.textContent = current === 'modern' ? 'Modern Glass' : 'Editorial Serif';
  });
}

// 4. Bind events on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  updateThemeIcons();
  updateFontLabels();

  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.onclick = toggleTheme;
  }

  const fontBtn = document.getElementById('fontToggleBtn');
  if (fontBtn) {
    fontBtn.onclick = toggleFontTheme;
  }
});
