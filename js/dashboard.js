import { acceptRequest, declineRequest, loadDashboardStats, loadNotifications, loadRequests, loadTimeActivity, loadTransactions, loadUserProfile, loadWallet } from "./api.js";
import { mountChrome } from "./app.js";
import { animateCount, formatDate, formatHours, initials, toast } from "./ui.js";
import { drawTimeActivity } from "./charts.js";

function txClass(type) {
  if (type === "community_donation") return "donate";
  if (type === "earned" || type === "service_payment") return "earn";
  return "spend";
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await mountChrome({ app: true }))) return;
  try {
  const wallet = await loadWallet();
  animateCount(document.querySelector("[data-balance]"), wallet.balance, { decimals: 1, suffix: " hrs" });
  document.querySelector("[data-earned]").textContent = `+${wallet.earned} hrs`;
  document.querySelector("[data-spent]").textContent = `-${wallet.spent} hrs`;
  document.querySelector("[data-community]").textContent = `+${wallet.community} hrs`;

  const dashboardStats = await loadDashboardStats();
  document.querySelector("[data-active-services]").textContent = String(dashboardStats.activeServices);
  document.querySelector("[data-completed]").textContent = String(dashboardStats.completed);
  document.querySelector("[data-rating]").textContent = dashboardStats.averageRating === null ? "No ratings yet" : `${dashboardStats.averageRating.toFixed(1)} ★`;
  document.querySelector("[data-response-rate]").textContent = dashboardStats.responseRate === null ? "No requests yet" : `${dashboardStats.responseRate}%`;

  const profile = await loadUserProfile();
  const avatar = document.querySelector(".dashboard-tools .avatar");
  if (avatar) avatar.textContent = initials(profile.fullName);

  const txs = await loadTransactions();
  document.querySelector("[data-tx-list]").innerHTML = txs
    .slice(0, 4)
    .map(
      (row) => `
      <div class="tx">
        <strong class="amt ${txClass(row.type)} num">${row.incoming ? "+" : "-"}${row.amount.toFixed(1)} hr</strong>
        <div>
          <div>${row.service}</div>
          <div class="muted">${formatDate(row.date)}</div>
        </div>
        <span class="muted">${row.status}</span>
      </div>
    `
    )
    .join("");

  const requests = await loadRequests();
  const pending = requests.filter((item) => item.status === "pending");
  document.querySelectorAll("[data-request-count]").forEach((element) => { element.textContent = String(pending.length); });
  document.querySelectorAll("[data-side-request-count]").forEach((element) => {
    element.textContent = pending.length ? String(pending.length) : "";
    element.hidden = pending.length === 0;
  });
  const requestList = document.querySelector("[data-dashboard-requests]");
  if (requestList) {
    requestList.innerHTML = pending.slice(0, 3).map((request) => `
      <div class="request-row">
        <span class="avatar avatar-small">${initials(request.from?.fullName || "Member")}</span>
        <div class="request-copy"><strong>${request.from?.fullName || "TimeBank member"}</strong><span>${request.service?.title || "Time exchange"} · ${formatHours(request.hours)}</span></div>
        <div class="request-actions"><button class="btn btn-soft btn-small" data-decline-request="${request.id}" type="button">Decline</button><button class="btn btn-primary btn-small" data-accept-request="${request.id}" type="button">Accept</button></div>
      </div>`).join("") || `<p class="muted empty-state">You are all caught up.</p>`;
    requestList.addEventListener("click", async (event) => {
      const accept = event.target.closest("[data-accept-request]");
      const decline = event.target.closest("[data-decline-request]");
      if (!accept && !decline) return;
      const requestId = (accept || decline).dataset[accept ? "acceptRequest" : "declineRequest"];
      try {
        if (accept) await acceptRequest(requestId);
        else await declineRequest(requestId);
        (accept || decline).closest(".request-row")?.remove();
        toast(accept ? "Request accepted." : "Request declined.");
      } catch (error) {
        toast(error.message, "error");
      }
    });
  }
  const notes = await loadNotifications();
  document.querySelector("[data-note-count]").textContent = String(notes.filter((item) => item.unread).length);
  const activityRange = document.querySelector("[data-activity-range]");
  let currentActivity = null;
  const redrawActivity = () => {
    if (!currentActivity) return;
    drawTimeActivity(document.querySelector("[data-activity-chart]"), currentActivity.points, document.querySelector("[data-activity-tooltip]"));
  };
  const renderActivity = async () => {
    const plot = document.querySelector(".activity-plot");
    const message = document.querySelector("[data-activity-message]");
    plot.dataset.activityState = "loading";
    message.textContent = "Loading time activity...";
    message.hidden = false;
    document.querySelector("[data-activity-chart]").hidden = true;
    try {
      const activity = await loadTimeActivity(Number(activityRange.value));
      currentActivity = activity;
      const earned = document.querySelector("[data-activity-earned]");
      const spent = document.querySelector("[data-activity-spent]");
      const net = document.querySelector("[data-activity-net]");
      earned.textContent = `+${activity.totalEarned.toFixed(1)} hrs`;
      spent.textContent = `-${activity.totalSpent.toFixed(1)} hrs`;
      net.textContent = `${(activity.totalEarned - activity.totalSpent >= 0 ? "+" : "")}${(activity.totalEarned - activity.totalSpent).toFixed(1)} hrs`;
      if (!activity.points.some((point) => point.earned || point.spent)) {
        plot.dataset.activityState = "empty";
        message.textContent = "No time activity yet. Complete your first exchange to see your time activity here.";
        return;
      }
      message.hidden = true;
      document.querySelector("[data-activity-chart]").hidden = false;
      redrawActivity();
      plot.dataset.activityState = "ready";
    } catch (error) {
      console.error("Time activity load failed:", error);
      plot.dataset.activityState = "error";
      message.textContent = "Unable to load time activity.";
      message.hidden = false;
    }
  };
  activityRange.addEventListener("change", renderActivity);
  await renderActivity();
  window.addEventListener("resize", redrawActivity);
  } catch (error) {
    const main = document.querySelector(".app-main");
    if (main) main.insertAdjacentHTML("afterbegin", `<div class="empty error-state"><p>${error.message}</p></div>`);
  }
});
