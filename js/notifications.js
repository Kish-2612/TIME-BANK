import { loadNotifications, markNotificationsRead } from "./api.js";
import { mountChrome } from "./app.js";
import { toast } from "./ui.js";

const icons = {
  request: "New request",
  earn: "Time earned",
  rating: "New rating",
  match: "Match ready",
  pool: "Community"
};

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await mountChrome({ app: true }))) return;
  let list;
  try {
    list = await loadNotifications();
  } catch (error) {
    document.querySelector("[data-notes]").innerHTML = `<div class="empty error-state"><p>${error.message}</p></div>`;
    return;
  }
  const root = document.querySelector("[data-notes]");
  root.innerHTML = list.length ? list
    .map(
      (item) => `
      <article class="notif ${item.unread ? "unread" : ""}">
        <div class="avatar">${item.unread ? "●" : "○"}</div>
        <div>
          <strong>${item.title}</strong>
          <p class="muted">${item.body}</p>
        </div>
        <span class="muted">${icons[item.type] || "Update"}</span>
      </article>
    `
    )
    .join("") : `<div class="empty"><p>You're all caught up.</p></div>`;

  document.querySelector("[data-mark-read]")?.addEventListener("click", async () => {
    await markNotificationsRead();
    document.querySelectorAll(".notif").forEach((node) => node.classList.remove("unread"));
    toast("All notifications marked as read.");
  });
});
