import { getSession, logout, loadUserProfile } from "./api.js";
import { isSupabaseConfigured, supabase } from "./supabase.js";
import { closeModal, observeReveal } from "./ui.js";
import { icon, initials } from "./ui.js";

const logoSvg = `
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
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
  let session = getSession();
  if (isSupabaseConfigured) {
    try {
      session = (await supabase.auth.getSession()).data.session;
    } catch (error) {
      console.warn("Unable to read the Supabase session; using the public navigation.", error);
    }
  }
  if (app && !session) {
    window.location.href = "login.html";
    return false;
  }
  let currentProfile = null;
  if (session) {
    try {
      currentProfile = await loadUserProfile();
    } catch (error) {
      console.warn("Unable to load the signed-in profile for shared navigation.", error);
    }
  }
  if (nav) {
    const page = document.body.dataset.page;
    nav.innerHTML = `
      <div class="nav-inner">
        <a class="logo" href="index.html"><span class="logo-mark">${logoSvg}</span><span><b>Time</b><strong>Bank</strong></span></a>
        <nav class="nav-links" aria-label="Primary">
          <a href="index.html#how">How It Works</a>
          <a href="marketplace.html" class="${page === "marketplace" ? "is-active" : ""}">Marketplace</a>
          <a href="community.html" class="${page === "community" ? "is-active" : ""}">Community Pool</a>
          <a href="index.html#matching">Matching</a>
        </nav>
        <div class="nav-actions">
          ${
            session
              ? `<div class="dropdown" data-user-menu>
                  <button class="user-chip" type="button" aria-haspopup="true" aria-expanded="false">
                    <span class="avatar">${initials(currentProfile?.fullName || "Member")}</span>
                    <span class="hide-sm">${currentProfile?.fullName || "Member"}</span>
                  </button>
                  <div class="dropdown-menu">
                    <a href="dashboard.html">Dashboard</a>
                    <a href="wallet.html">Time Wallet</a>
                    <a href="profile.html">Profile</a>
                    <button type="button" data-logout>Log out</button>
                  </div>
                </div>`
                : `<a class="btn btn-link hide-sm" href="login.html">Sign In</a>
                  <a class="btn btn-primary" href="register.html">Join Now</a>`
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
        <a class="logo" href="dashboard.html" style="margin: 0 12px 22px;"><span class="logo-mark">${logoSvg}</span><span><b>Time</b><strong>Bank</strong></span></a>
        <nav aria-label="Dashboard">
          ${links
            .map(([href, label, key]) => {
              const active = page === key;
              const names = { dashboard: "home", wallet: "wallet", offer: "grid", marketplace: "grid", requests: "check", transactions: "wallet", notifications: "bell", community: "grid", profile: "user" };
              return `<a class="side-link ${active ? "is-active" : ""}" href="${href}"${active ? ' aria-current="page"' : ""}>${icon(names[key])}<span>${label}</span>${key === "requests" ? '<b class="side-count" data-side-request-count></b>' : ""}</a>`;
            })
            .join("")}
        </nav>
      `;
    }
    const bottom = document.querySelector("[data-bottom-nav]");
    if (bottom) {
      bottom.innerHTML = `
        <a href="dashboard.html" class="${page === "dashboard" ? "is-active" : ""}">${icon("home")}<span>Overview</span></a>
        <a href="marketplace.html" class="${page === "marketplace" ? "is-active" : ""}">Market</a>
        <a href="wallet.html" class="${page === "wallet" ? "is-active" : ""}">Wallet</a>
        <a href="requests.html" class="${page === "requests" ? "is-active" : ""}">Requests</a>
        <a href="profile.html" class="${page === "profile" ? "is-active" : ""}">Profile</a>
      `;
    }
    const greet = document.querySelector("[data-greeting]");
    if (greet) {
      try {
        const profile = currentProfile || await loadUserProfile();
        const firstName = profile.fullName?.split(" ")[0] || "there";
        greet.textContent = `${greeting()}, ${firstName}`;
      } catch (error) {
        console.warn("Unable to load the dashboard profile greeting.", error);
      }
    }
  }

  const publicSidebar = document.querySelector("[data-public-sidebar]");
  if (publicSidebar) {
    const page = document.body.dataset.page;
    const links = [
      ["index.html", "Home", "home"],
      ["index.html#how", "How It Works", ""],
      ["marketplace.html", "Marketplace", "marketplace"],
      ["community.html", "Community", "community"],
      ["index.html#about", "About", ""]
    ];
    publicSidebar.innerHTML = `
      <a class="logo" href="index.html" style="margin: 0 12px 22px;">${logoSvg} TIMEBANK</a>
      <nav aria-label="Public navigation">
        ${links
          .map(([href, label, key]) => `<a class="side-link ${page === key ? "is-active" : ""}" href="${href}"${page === key ? ' aria-current="page"' : ""}>${label}</a>`)
          .join("")}
      </nav>
    `;
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
      <span>Securely connected to your TimeBank ledger.</span>
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
