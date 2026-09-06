import { CATEGORIES } from "./data.js";
import { loadServices, requestService } from "./api.js";
import { mountChrome, renderFooter } from "./app.js";
import { initials, setButtonBusy, stars, toast } from "./ui.js";

function ownerOf(service) {
  return service.provider;
}

function card(service) {
  const user = ownerOf(service);
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
      <div class="stars">${stars(service.rating)}</div>
      <div class="meta-row">
        <span>${service.duration} Hour${service.duration === 1 ? "" : "s"}</span>
        <span class="num">${service.cost} Time Credit</span>
        <span>${service.availability}</span>
      </div>
      <div style="display:flex;gap:8px;">
        <a class="btn btn-ghost" href="service.html?id=${service.id}">Details</a>
        <button class="btn btn-primary" data-request="${service.id}">Request Service</button>
      </div>
    </article>
  `;
}

async function render(category, query) {
  const grid = document.querySelector("[data-service-grid]");
  grid.innerHTML = `<div class="skeleton" style="height:180px;"></div>`.repeat(3);
  const services = await loadServices({ category, query });
  if (!services.length) {
    grid.innerHTML = `
      <div class="empty" style="grid-column:1/-1;">
        <p>No services found yet.</p>
        <a class="btn btn-primary" href="offer.html" style="margin-top:16px;">Offer Your First Skill</a>
      </div>`;
    return;
  }
  grid.innerHTML = services.map(card).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  await mountChrome();
  renderFooter();
  const filters = document.querySelector("[data-filters]");
  filters.innerHTML = CATEGORIES.map(
    (category, index) =>
      `<button class="filter-chip ${index === 0 ? "is-active" : ""}" type="button" data-category="${category}">${category}</button>`
  ).join("");

  let category = "All";
  let query = "";
  await render(category, query);

  filters.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    category = button.dataset.category;
    filters.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
    await render(category, query);
  });

  document.querySelector("[data-search]")?.addEventListener("input", async (event) => {
    query = event.target.value.trim();
    await render(category, query);
  });

  document.querySelector("[data-service-grid]").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-request]");
    if (!button) return;
    setButtonBusy(button, true);
    try {
      await requestService(button.dataset.request, "I'd like to book this hour.");
      toast("Request sent. You'll hear back in your Requests inbox.");
    } catch (error) {
      toast(error.message || "Unable to send the service request.", "error");
    } finally {
      setButtonBusy(button, false);
    }
  });
});
