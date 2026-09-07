import { acceptRequest, declineRequest, loadRequests } from "./api.js";
import { isSupabaseConfigured, supabase } from "./supabase.js";
import { mountChrome } from "./app.js";
import { initials, toast } from "./ui.js";

function render(list) {
  const root = document.querySelector("[data-requests]");
  const open = list.filter((item) => ["pending", "accepted", "in_progress"].includes(item.status));
  if (!open.length) {
    root.innerHTML = `<div class="empty"><p>No open requests right now.</p><a class="btn btn-primary" href="marketplace.html">Find someone to help</a></div>`;
    return;
  }
  root.innerHTML = open
    .map(
      (item) => `
      <article class="request-card" data-card="${item.id}">
        <div class="badge">${item.status === "pending" ? "Pending request" : item.status === "in_progress" ? "In progress" : "Accepted"}</div>
        <div class="person" style="margin:12px 0;">
          <div class="avatar">${initials(item.from.fullName)}</div>
          <strong>${item.from.fullName} wants your help</strong>
        </div>
        <p>Service: ${item.service?.title || "Custom hour"}</p>
        <p>Requested: ${item.hours} Hour</p>
        <p style="margin:10px 0 16px;">Message: “${item.message}”</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${item.status === "pending" && item.isProvider
            ? `<button class="btn btn-primary" data-accept="${item.id}">Accept</button>
               <button class="btn btn-danger" data-decline="${item.id}">Decline</button>`
            : item.status !== "new"
              ? `<a class="btn btn-primary" href="call.html?session=${item.session?.id || ""}">Join video call</a>`
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

  let refreshChannel;
  if (isSupabaseConfigured) {
    refreshChannel = supabase
      .channel("timebank-request-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, async () => {
        list = await loadRequests();
        render(list);
      })
      .subscribe();
  }

  document.querySelector("[data-requests]").addEventListener("click", async (event) => {
    const accept = event.target.closest("[data-accept]");
    const decline = event.target.closest("[data-decline]");
    if (accept) {
      const requestId = accept.dataset.accept;
      try {
        const result = await acceptRequest(requestId);
        toast("Request accepted. Starting your TimeBank session.");
        window.location.href = `call.html?session=${result.session.id}`;
      } catch (error) {
        toast(error.message || "Unable to accept this request.", "error");
      }
      return;
    }
    if (decline) {
      try {
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
      } catch (error) {
        toast(error.message || "Unable to decline this request.", "error");
      }
    }
  });
});
