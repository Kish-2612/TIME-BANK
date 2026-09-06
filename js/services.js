import { loadService, requestService } from "./api.js";
import { mountChrome, renderFooter } from "./app.js";
import { initials, setButtonBusy, stars, toast } from "./ui.js";

document.addEventListener("DOMContentLoaded", async () => {
  await mountChrome();
  renderFooter();
  const id = new URLSearchParams(window.location.search).get("id") || "s_java";
  const root = document.querySelector("[data-service]");
  root.innerHTML = `<div class="skeleton" style="height:280px;"></div>`;
  const service = await loadService(id);
  if (!service) {
    root.innerHTML = `<div class="empty"><p>This service is no longer listed.</p><a class="btn btn-primary" href="marketplace.html">Back to marketplace</a></div>`;
    return;
  }
  const provider = service.provider;
  root.innerHTML = `
    <div class="dark-card">
      <div class="person">
        <div class="avatar">${initials(provider.fullName)}</div>
        <div>
          <h1 style="font-size:1.6rem;">${provider.fullName}</h1>
          <div class="verified">${provider.verified ? "Verified member" : "Member"} · ${provider.location}</div>
          <div class="stars">${stars(provider.rating)}</div>
        </div>
      </div>
      <p class="muted" style="margin-top:16px;">${provider.hoursGiven} hrs given · ${provider.peopleHelped} people helped</p>
    </div>
    <div class="surface-card" style="margin-top:18px;">
      <p class="eyebrow">${service.category}</p>
      <h2 style="margin:8px 0 12px;">${service.title}</h2>
      <p>${service.description}</p>
      <div class="meta-row">
        <span>Duration ${service.duration} hr</span>
        <span class="num">Cost ${service.cost} Time Credit</span>
        <span>${service.availability}</span>
        <span>${service.mode} · ${service.location}</span>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
        <button class="btn btn-primary" data-book>Request This Service</button>
        <a class="btn btn-ghost" href="notifications.html">Message Provider</a>
      </div>
    </div>
  `;
  root.querySelector("[data-book]").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    setButtonBusy(button, true);
    try {
      await requestService(service.id, "I'd like to request this service.");
      toast("Request sent to the provider.");
    } catch (error) {
      toast(error.message || "Unable to send the service request.", "error");
    } finally {
      setButtonBusy(button, false);
    }
  });
});
