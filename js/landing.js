import { loadCommunity, loadPlatformStats, loadServices } from "./api.js";
import { mountChrome, renderFooter } from "./app.js";
import { initials, observeReveal } from "./ui.js";

async function renderStats() {
  const section = document.querySelector("[data-stats]");
  if (!section) return;
  const observer = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    loadPlatformStats().then((platform) => {
      section.querySelector("[data-stat=members]").textContent = String(platform.members);
      section.querySelector("[data-stat=services]").textContent = String(platform.services);
    }).catch(() => {
      section.querySelectorAll("[data-stat]").forEach((node) => { node.textContent = "—"; });
    });
    observer.disconnect();
  }, { threshold: 0.4 });
  observer.observe(section);
}

async function renderPreview() {
  const grid = document.querySelector("[data-market-preview]");
  if (!grid) return;
  let services;
  try {
    services = (await loadServices()).slice(0, 3);
  } catch (error) {
    grid.innerHTML = `<div class="empty"><p>Marketplace data is unavailable right now.</p></div>`;
    return;
  }
  grid.innerHTML = services
    .map((service) => {
      const user = service.provider;
      if (!user) return "";
      return `
        <article class="surface-card">
          <div class="person">
            <div class="avatar">${initials(user.fullName)}</div>
            <div>
              <strong>${user.fullName}</strong>
              <div class="muted">${service.title}</div>
            </div>
          </div>
          <p style="margin:14px 0;">“${service.description}”</p>
          <div class="stars">${service.rating ? `${service.rating.toFixed(1)} / 5` : "New service"}</div>
          <div class="meta-row">
            <span>${service.duration} Hour</span>
            <span class="num">${service.cost} Time Credit</span>
          </div>
          <a class="btn btn-primary btn-block" href="service.html?id=${service.id}">Request Service</a>
        </article>
      `;
    })
    .join("") || `<div class="empty"><p>No active services are available yet.</p></div>`;
}

async function renderMatches() {
  const root = document.querySelector("[data-matches]");
  if (!root) return;
  root.innerHTML = `<div class="empty"><p>No matches found yet.</p></div>`;
}

async function renderPool() {
  let pool;
  try {
    pool = await loadCommunity();
  } catch {
    const hours = document.querySelector("[data-pool-hours]");
    if (hours) hours.textContent = "Unavailable";
    document.querySelectorAll("[data-pool-donated], [data-pool-distributed]").forEach((node) => { node.textContent = "Pool data unavailable"; });
    return;
  }
  const hours = document.querySelector("[data-pool-hours]");
  if (hours) hours.textContent = pool.hours.toFixed(1);
  const donated = document.querySelector("[data-pool-donated]");
  const distributed = document.querySelector("[data-pool-distributed]");
  if (donated) donated.textContent = `${pool.donated.toFixed(1)} hrs donated`;
  if (distributed) distributed.textContent = `${pool.distributed.toFixed(1)} hrs distributed`;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await mountChrome();
    renderFooter();
    renderStats();
    await renderPreview();
    await renderMatches();
    await renderPool();
    observeReveal();
  } catch (error) {
    console.error("Landing page initialization failed:", error);
  }
});
