import { acceptRequest, declineRequest, loadRequests } from "./api.js";
import { mountChrome } from "./app.js";
import { initials, toast } from "./ui.js";

function render(list) {
  const root = document.querySelector("[data-requests]");
  const open = list.filter((item) => item.status === "new" || item.status === "accepted" || item.status === "in_progress");
  if (!open.length) {
    root.innerHTML = `<div class="empty"><p>No open requests right now.</p><a class="btn btn-primary" href="marketplace.html">Find someone to help</a></div>`;
    return;
  }
  root.innerHTML = open
    .map(
      (item) => `
      <article class="request-card" data-card="${item.id}">
        <div class="badge">${item.status === "new" ? "New request" : "Accepted"}</div>
        <div class="person" style="margin:12px 0;">
          <div class="avatar">${initials(item.from.fullName)}</div>
          <strong>${item.from.fullName} wants your help</strong>
        </div>
        <p>Service: ${item.service?.title || "Custom hour"}</p>
        <p>Requested: ${item.hours} Hour</p>
        <p style="margin:10px 0 16px;">Message: “${item.message}”</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${item.status === "new" && item.isProvider
            ? `<button class="btn btn-primary" data-accept="${item.id}">Accept</button>
               <button class="btn btn-danger" data-decline="${item.id}">Decline</button>`
            : item.status !== "new"
              ? `<a class="btn btn-primary" href="call.html?request=${item.id}">Join video call</a>`
              : `<span class="muted">Waiting for the provider</span>`}
        </div>
      </article>
    `
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await mountChrome({ app: true }))) return;
  let list = await loadRequests();
  render(list);

  document.querySelector("[data-requests]").addEventListener("click", async (event) => {
    const accept = event.target.closest("[data-accept]");
    const decline = event.target.closest("[data-decline]");
    if (accept) {
      const requestId = accept.dataset.accept;
      await acceptRequest(requestId);
      window.location.href = `call.html?request=${requestId}`;
      return;
      const card = accept.closest("[data-card]");
      card.style.transition = "transform 240ms ease, opacity 240ms ease";
      card.style.opacity = "0";
      card.style.transform = "translateX(16px)";
      toast("Request accepted. Time is reserved.");
      setTimeout(async () => {
        list = await loadRequests();
        render(list);
      }, 240);
    }
    if (decline) {
      await declineRequest(decline.dataset.decline);
      const card = decline.closest("[data-card]");
      card.style.transition = "transform 240ms ease, opacity 240ms ease";
      card.style.opacity = "0";
      card.style.transform = "translateX(-16px)";
      toast("Request declined.");
      setTimeout(async () => {
        list = await loadRequests();
        render(list);
      }, 240);
    }
  });
});
