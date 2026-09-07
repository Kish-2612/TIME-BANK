const toastRoot = () => document.querySelector("[data-toast-root]");
const modalRoot = () => document.querySelector("[data-modal-root]");

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function formatHours(value) {
  const number = Number(value);
  return `${number.toFixed(1)} hr${Math.abs(number) === 1 ? "" : "s"}`;
}

export function formatDate(iso) {
  const date = new Date(typeof iso === "string" && iso.includes("T") ? iso : `${iso}T12:00:00`);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function icon(name) {
  const paths = {
    home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z",
    wallet: "M4 7h16v12H4zm2-3h10v3M4 12h16",
    grid: "M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z",
    bell: "M6 16h12l-1.2-2.2V10a4.8 4.8 0 1 0-9.6 0v3.8zm4 3h4",
    user: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-7 8a7 7 0 0 1 14 0",
    check: "M5 12.5 9.2 17 19 7"
  };
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="${paths[name] || paths.grid}"/></svg>`;
}

export function toast(message, type = "success") {
  const root = toastRoot();
  if (!root) return;
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.setAttribute("role", "status");
  item.textContent = message;
  root.append(item);
  setTimeout(() => item.remove(), 3200);
}

export function openModal({ title, body, confirmText = "Confirm", onConfirm }) {
  const root = modalRoot();
  if (!root) return;
  root.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title">${title}</h2>
      <p class="muted" style="margin: 10px 0 20px;">${body}</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button class="btn btn-ghost" data-close-modal type="button">Cancel</button>
        <button class="btn btn-primary" data-confirm-modal type="button">${confirmText}</button>
      </div>
    </div>
  `;
  root.classList.add("is-open");
  document.body.classList.add("is-locked");
  root.querySelector("[data-close-modal]").addEventListener("click", closeModal);
  root.querySelector("[data-confirm-modal]").addEventListener("click", async () => {
    await onConfirm?.();
    closeModal();
  });
}

export function closeModal() {
  const root = modalRoot();
  if (!root) return;
  root.classList.remove("is-open");
  root.innerHTML = "";
  document.body.classList.remove("is-locked");
}

export function observeReveal() {
  const nodes = document.querySelectorAll(".reveal, [data-observe]");
  if (!nodes.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.24 }
  );
  nodes.forEach((node) => observer.observe(node));
}

export function animateCount(el, to, { decimals = 0, prefix = "", suffix = "" } = {}) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    el.textContent = `${prefix}${to.toFixed(decimals)}${suffix}`;
    return;
  }
  const start = performance.now();
  const from = 0;
  const duration = 1100;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = from + (to - from) * eased;
    el.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function setButtonBusy(button, busy, label = "Processing...") {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

export function stars(rating) {
  const full = Math.round(rating);
  return `${"★".repeat(full)}${"☆".repeat(5 - full)} ${rating.toFixed(1)}`;
}
