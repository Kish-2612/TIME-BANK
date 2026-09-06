import { getSession, logout, loadUserProfile } from "./api.js";
import { isSupabaseConfigured, supabase } from "./supabase.js";
import { closeModal, observeReveal } from "./ui.js";

const logoSvg = `
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 3h10M8 3c0 4 3 6 4 9-1 3-4 5-4 9M16 3c0 4-3 6-4 9 1 3 4 5 4 9M7 21h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  </svg>
`;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export async function mountChrome({ app = false } = {}) {
  const nav = document.querySelector("[data-nav]");
  const session = isSupabaseConfigured
    ? (await supabase.auth.getSession()).data.session
    : getSession();
  if (app && !session) {
    window.location.href = "login.html";
    return false;
  }
  if (nav) {
    const page = document.body.dataset.page;
    nav.innerHTML = `
      <div class="nav-inner">
        <a class="logo" href="index.html">${logoSvg} TIMEBANK</a>
        <nav class="nav-links" aria-label="Primary">
          <a href="index.html" class="${page === "home" ? "is-active" : ""}">Home</a>
          <a href="index.html#how">How It Works</a>
          <a href="marketplace.html" class="${page === "marketplace" ? "is-active" : ""}">Marketplace</a>
          <a href="community.html" class="${page === "community" ? "is-active" : ""}">Community</a>
          <a href="index.html#about">About</a>
        </nav>
        <div class="nav-actions">
          ${
            session
              ? `<div class="dropdown" data-user-menu>
                  <button class="user-chip" type="button" aria-haspopup="true" aria-expanded="false">
                    <span class="avatar">AR</span>
                    <span class="hide-sm">Alex</span>
                  </button>
                  <div class="dropdown-menu">
                    <a href="dashboard.html">Dashboard</a>
                    <a href="wallet.html">Time Wallet</a>
                    <a href="profile.html">Profile</a>
                    <button type="button" data-logout>Log out</button>
                  </div>
                </div>`
              : `<a class="btn btn-ghost hide-sm" href="login.html">Log In</a>
                 <a class="btn btn-primary" href="register.html">Start Banking Time</a>`
          }
          <button class="hamburger" type="button" aria-label="Open menu" data-hamburger><span></span></button>
        </div>
      </div>
    `;
  }

  const mobile = document.querySelector("[data-mobile-menu]");
  if (mobile) {
    const mobileLinks = app
      ? [
          ["dashboard.html", "Overview", "dashboard"],
          ["wallet.html", "Time Wallet", "wallet"],
          ["offer.html", "My Services", "offer"],
          ["marketplace.html", "Marketplace", "marketplace"],
          ["requests.html", "Requests", "requests"],
          ["transactions.html", "Transactions", "transactions"],
          ["notifications.html", "Notifications", "notifications"],
          ["community.html", "Community", "community"],
          ["profile.html", "Profile", "profile"]
        ]
      : [
          ["index.html", "Home", "home"],
          ["index.html#how", "How It Works", ""],
          ["marketplace.html", "Marketplace", "marketplace"],
          ["community.html", "Community", "community"],
          ["index.html#about", "About", ""],
          ["login.html", "Log In", "login"],
          ["register.html", "Start Banking Time", "register"]
        ];
    const page = document.body.dataset.page;
    mobile.innerHTML = mobileLinks
      .map(([href, label, key]) => `<a href="${href}"${key === page ? ' aria-current="page"' : ""}>${label}</a>`)
      .join("");
  }

  if (app) {
    const sidebar = document.querySelector("[data-sidebar]");
    const page = document.body.dataset.page;
    const links = [
      ["dashboard.html", "Overview", "dashboard"],
      ["wallet.html", "Time Wallet", "wallet"],
      ["offer.html", "My Services", "offer"],
      ["marketplace.html", "Marketplace", "marketplace"],
      ["requests.html", "Requests", "requests"],
      ["transactions.html", "Transactions", "transactions"],
      ["notifications.html", "Notifications", "notifications"],
      ["community.html", "Community", "community"],
      ["profile.html", "Profile", "profile"]
    ];
    if (sidebar) {
      sidebar.innerHTML = `
        <a class="logo" href="dashboard.html" style="margin: 0 12px 22px;">${logoSvg} TIMEBANK</a>
        <nav aria-label="Dashboard">
          ${links
            .map(([href, label, key]) => {
              const active = page === key;
              return `<a class="side-link ${active ? "is-active" : ""}" href="${href}"${active ? ' aria-current="page"' : ""}>${label}</a>`;
            })
            .join("")}
        </nav>
      `;
    }
    const bottom = document.querySelector("[data-bottom-nav]");
    if (bottom) {
      bottom.innerHTML = `
        <a href="dashboard.html" class="${page === "dashboard" ? "is-active" : ""}">Overview</a>
        <a href="marketplace.html" class="${page === "marketplace" ? "is-active" : ""}">Market</a>
        <a href="wallet.html" class="${page === "wallet" ? "is-active" : ""}">Wallet</a>
        <a href="requests.html" class="${page === "requests" ? "is-active" : ""}">Requests</a>
        <a href="profile.html" class="${page === "profile" ? "is-active" : ""}">Profile</a>
      `;
    }
    const greet = document.querySelector("[data-greeting]");
    if (greet) {
      const profile = await loadUserProfile();
      greet.textContent = `${greeting()}, ${profile.fullName.split(" ")[0]}`;
    }
  }

  bindChrome();
  return true;
}

function bindChrome() {
  const nav = document.querySelector("[data-nav]");
  const onScroll = () => nav?.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const burger = document.querySelector("[data-hamburger]");
  const mobile = document.querySelector("[data-mobile-menu]");
  burger?.addEventListener("click", () => {
    const open = mobile.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("is-locked", open);
  });

  const menu = document.querySelector("[data-user-menu]");
  menu?.querySelector("button")?.addEventListener("click", () => {
    menu.classList.toggle("is-open");
    menu.querySelector("button").setAttribute("aria-expanded", menu.classList.contains("is-open"));
  });
  document.addEventListener("click", (event) => {
    if (menu && !menu.contains(event.target)) menu.classList.remove("is-open");
  });

  document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    await logout();
    window.location.href = "index.html";
  });

  document.querySelector("[data-modal-root]")?.addEventListener("click", (event) => {
    if (event.target.hasAttribute("data-modal-root")) closeModal();
  });

  observeReveal();
}

export function renderFooter() {
  const footer = document.querySelector("[data-footer]");
  if (!footer) return;
  footer.innerHTML = `
    <div class="container footer-grid">
      <div class="footer-brand">
        <a class="logo" href="index.html">${logoSvg} TIMEBANK</a>
        <p>A bank for human time. Give an hour. Earn an hour. Keep the ledger honest.</p>
      </div>
      <div class="footer-col">
        <h3>Product</h3>
        <a href="marketplace.html">Marketplace</a>
        <a href="wallet.html">Time Wallet</a>
        <a href="community.html">Community Pool</a>
      </div>
      <div class="footer-col">
        <h3>Company</h3>
        <a href="index.html#about">About</a>
        <a href="index.html#how">How it works</a>
        <a href="login.html">Log in</a>
      </div>
      <div class="footer-col">
        <h3>Trust</h3>
        <a href="transactions.html">Ledger</a>
        <a href="profile.html">Reputation</a>
        <a href="register.html">Open an account</a>
      </div>
    </div>
    <div class="container footer-bottom">
      <span>© 2026 TimeBank. Your time has value.</span>
      <span>Ready for Supabase. Mock ledger active.</span>
    </div>
  `;
}

export function requireSession() {
  if (!getSession()) {
    window.location.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("page-enter");
});
