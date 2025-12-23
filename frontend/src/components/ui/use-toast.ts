// Simple client-side toast utility
// Lightweight fallback for missing toast implementation used in several components
type ToastOptions = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
};

export function toast({ title, description, variant = 'default', duration = 4000 }: ToastOptions) {
  if (typeof window === 'undefined') return;

  const containerId = 'cinestream-toast-container';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    Object.assign(container.style, {
      position: 'fixed',
      right: '16px',
      top: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: '9999',
      pointerEvents: 'none',
    });
    document.body.appendChild(container);
  }

  const toastEl = document.createElement('div');
  toastEl.setAttribute('role', 'status');
  toastEl.style.pointerEvents = 'auto';
  toastEl.style.minWidth = '220px';
  toastEl.style.maxWidth = '360px';
  toastEl.style.padding = '12px 14px';
  toastEl.style.borderRadius = '8px';
  toastEl.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
  toastEl.style.background = variant === 'destructive' ? '#fee2e2' : variant === 'success' ? '#ecfdf5' : '#ffffff';
  toastEl.style.color = '#0f172a';
  toastEl.style.fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
  toastEl.style.border = '1px solid rgba(15,23,42,0.06)';
  toastEl.style.opacity = '0';
  toastEl.style.transition = 'transform 200ms ease, opacity 200ms ease';
  toastEl.style.transform = 'translateY(-8px)';

  if (title) {
    const t = document.createElement('div');
    t.style.fontWeight = '600';
    t.style.marginBottom = description ? '6px' : '0';
    t.textContent = title;
    toastEl.appendChild(t);
  }

  if (description) {
    const d = document.createElement('div');
    d.style.fontSize = '13px';
    d.style.opacity = '0.9';
    d.textContent = description;
    toastEl.appendChild(d);
  }

  container.appendChild(toastEl);

  // animate in
  requestAnimationFrame(() => {
    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translateY(0)';
  });

  const timeout = setTimeout(() => {
    // animate out
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateY(-8px)';
    setTimeout(() => {
      toastEl.remove();
      if (container && container.childElementCount === 0) container.remove();
    }, 220);
  }, duration);

  // allow manual dismiss on click
  toastEl.addEventListener('click', () => {
    clearTimeout(timeout);
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateY(-8px)';
    setTimeout(() => {
      toastEl.remove();
      if (container && container.childElementCount === 0) container.remove();
    }, 220);
  });
}

export default toast;
