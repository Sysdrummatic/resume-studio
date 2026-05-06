(function initStaticStatusToast() {
  const AUTO_CLOSE_MS = 5000;
  const ANIMATION_MS = 180;
  let activeToast = null;
  let autoCloseTimer = null;
  let removeTimer = null;

  function normalizeVariant(variant) {
    return variant === 'warning' || variant === 'error' ? variant : 'success';
  }

  function ensureToast() {
    if (activeToast) {
      return activeToast;
    }

    const toast = document.createElement('div');
    toast.className = 'resume-status-toast';

    const text = document.createElement('p');
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'resume-status-toast__close';
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.innerHTML = '<span aria-hidden="true">&times;</span>';
    closeButton.addEventListener('click', close);

    toast.append(text, closeButton);
    document.body.append(toast);
    activeToast = toast;
    return toast;
  }

  function clearTimers() {
    window.clearTimeout(autoCloseTimer);
    window.clearTimeout(removeTimer);
    autoCloseTimer = null;
    removeTimer = null;
  }

  function show(message, variant = 'success') {
    const normalizedMessage = String(message || '').trim();
    if (!normalizedMessage) {
      close();
      return;
    }

    clearTimers();
    const normalizedVariant = normalizeVariant(variant);
    const toast = ensureToast();
    toast.className = `resume-status-toast resume-status-toast--${normalizedVariant}`;
    toast.setAttribute('role', normalizedVariant === 'error' ? 'alert' : 'status');
    toast.querySelector('p').textContent = normalizedMessage;

    autoCloseTimer = window.setTimeout(close, AUTO_CLOSE_MS);
  }

  function close() {
    if (!activeToast) {
      return;
    }

    clearTimers();
    activeToast.classList.add('resume-status-toast--leaving');
    removeTimer = window.setTimeout(() => {
      activeToast?.remove();
      activeToast = null;
    }, ANIMATION_MS);
  }

  window.ResumeStatusToast = {
    show,
    close,
  };
})();
