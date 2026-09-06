import { loadCommunity, loadMatches, loadServices, loadWallet, stats } from "./api.js";
import { weeklyActivity } from "./data.js";
import { mountChrome, renderFooter } from "./app.js";
import { animateCount, initials, observeReveal, stars } from "./ui.js";
import { drawLineChart } from "./charts.js";

function ringOffset(percent, radius = 90) {
  const circumference = 2 * Math.PI * radius;
  return circumference - (percent / 100) * circumference;
}

async function renderHeroWallet() {
  const wallet = await loadWallet();
  const value = document.querySelector("[data-hero-balance]");
  const earned = document.querySelector("[data-hero-earned]");
  if (value) animateCount(value, wallet.balance, { decimals: 1 });
  if (earned) earned.textContent = `+${wallet.earnedThisWeek.toFixed(1)} earned this week`;
  const progress = document.querySelector("[data-hero-progress]");
  if (progress) progress.style.strokeDashoffset = String(ringOffset(68));
}

async function renderStats() {
  const section = document.querySelector("[data-stats]");
  if (!section) return;
  const observer = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    animateCount(section.querySelector("[data-stat=members]"), stats.members, { suffix: "+" });
    animateCount(section.querySelector("[data-stat=hours]"), stats.hours, { suffix: "+" });
    animateCount(section.querySelector("[data-stat=services]"), stats.services, { suffix: "+" });
    animateCount(section.querySelector("[data-stat=rating]"), stats.rating, { decimals: 1, suffix: "/5" });
    observer.disconnect();
  }, { threshold: 0.4 });
  observer.observe(section);
}

async function renderPreview() {
  const grid = document.querySelector("[data-market-preview]");
  if (!grid) return;
  const services = (await loadServices()).slice(0, 3);
  const { users } = await import("./data.js");
  grid.innerHTML = services
    .map((service) => {
      const user = users.find((item) => item.id === service.userId);
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
          <div class="stars">${stars(service.rating)}</div>
          <div class="meta-row">
            <span>${service.duration} Hour</span>
            <span class="num">${service.cost} Time Credit</span>
          </div>
          <a class="btn btn-primary btn-block" href="service.html?id=${service.id}">Request Service</a>
        </article>
      `;
    })
    .join("");
}

async function renderMatches() {
  const root = document.querySelector("[data-matches]");
  if (!root) return;
  const matches = await loadMatches();
  root.innerHTML = matches
    .map((match) => {
      const circumference = 2 * Math.PI * 36;
      const offset = circumference - (match.percent / 100) * circumference;
      return `
        <article class="dark-card">
          <div class="match-ring" aria-label="${match.percent}% match">
            <svg viewBox="0 0 84 84">
              <circle cx="42" cy="42" r="36" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6"/>
              <circle cx="42" cy="42" r="36" fill="none" stroke="#8B7CFF" stroke-width="6" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
            </svg>
            <div class="center">${match.percent}%</div>
          </div>
          <h3 style="margin:12px 0 4px;">${match.user.fullName}</h3>
          <p class="muted">${match.user.skills.join(" · ")}</p>
          <p style="margin:12px 0 4px;">You need: ${match.need}</p>
          <p>They offer: ${match.offer}</p>
          <p class="stars" style="margin:10px 0 16px;">${stars(match.user.rating)}</p>
          <a class="btn btn-ghost" href="profile.html?id=${match.user.id}">View Profile</a>
        </article>
      `;
    })
    .join("");
}

async function renderPool() {
  const pool = await loadCommunity();
  const hours = document.querySelector("[data-pool-hours]");
  const donors = document.querySelector("[data-pool-donors]");
  const helped = document.querySelector("[data-pool-helped]");
  if (hours) animateCount(hours, pool.hours);
  if (donors) donors.textContent = String(pool.donors);
  if (helped) helped.textContent = String(pool.helped);
}

document.addEventListener("DOMContentLoaded", async () => {
  await mountChrome();
  renderFooter();
  await renderHeroWallet();
  renderStats();
  await renderPreview();
  await renderMatches();
  await renderPool();
  observeReveal();
  const spark = document.querySelector("[data-spark]");
  if (spark) drawLineChart(spark, weeklyActivity);
});
