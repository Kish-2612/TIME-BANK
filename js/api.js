import { isSupabaseConfigured, supabase } from "./supabase.js";

function requireBackend() {
  if (!isSupabaseConfigured) throw new Error("TimeBank backend configuration is missing.");
  return supabase;
}

async function currentUser() {
  const client = requireBackend();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Your session has expired. Please log in again.");
  return data.user;
}

function mapProfile(data) {
  return {
    id: data.id,
    fullName: data.full_name,
    username: data.username || "",
    avatarUrl: data.avatar_url || "",
    bio: data.bio || "",
    location: data.location || "",
    verified: Boolean(data.is_verified),
    skills: data.user_skills?.map((item) => item.skills?.name).filter(Boolean) || [],
    rating: Number(data.rating || 0),
    hoursGiven: Number(data.hoursGiven || 0),
    hoursReceived: Number(data.hoursReceived || 0),
    peopleHelped: Number(data.peopleHelped || 0),
    reputation: Number(data.reputation || 0)
  };
}

export async function loadUserProfile(id) {
  const user = id ? { id } : await currentUser();
  const client = requireBackend();
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, username, avatar_url, bio, location, is_verified, user_skills(skill_type, skills(name))")
    .eq("id", user.id)
    .single();
  if (error) throw new Error("Unable to load this profile.");
  const [transactionResult, requestResult, reviewResult] = await Promise.all([
    client.from("transactions").select("amount, sender_id, receiver_id").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
    client.from("service_requests").select("provider_id, requester_id, status").or(`provider_id.eq.${user.id},requester_id.eq.${user.id}`),
    client.from("reviews").select("rating").eq("reviewee_id", user.id)
  ]);
  if (transactionResult.error || requestResult.error || reviewResult.error) throw new Error("Unable to load profile activity.");
  const transactions = transactionResult.data || [];
  const requests = requestResult.data || [];
  const reviews = reviewResult.data || [];
  return mapProfile({ ...data,
    hoursGiven: transactions.filter((row) => row.sender_id === user.id).reduce((sum, row) => sum + Number(row.amount), 0),
    hoursReceived: transactions.filter((row) => row.receiver_id === user.id).reduce((sum, row) => sum + Number(row.amount), 0),
    peopleHelped: new Set(requests.filter((row) => row.provider_id === user.id && row.status === "completed").map((row) => row.requester_id)).size,
    rating: reviews.length ? reviews.reduce((sum, row) => sum + Number(row.rating), 0) / reviews.length : 0,
    reputation: reviews.length ? Math.round((reviews.reduce((sum, row) => sum + Number(row.rating), 0) / reviews.length) * 20) : 0
  });
}

export async function loadWallet() {
  const user = await currentUser();
  const client = requireBackend();
  const { data, error } = await client.from("wallets").select("balance, total_earned, total_spent, total_donated").eq("user_id", user.id).single();
  if (error) throw new Error("Unable to load your wallet.");
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data: transactions, error: transactionError } = await client.from("transactions").select("amount, transaction_type, sender_id, receiver_id, created_at").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).gte("created_at", monthStart.toISOString());
  if (transactionError) throw new Error("Unable to load your wallet activity.");
  const earnedThisMonth = transactions.filter((row) => row.receiver_id === user.id).reduce((sum, row) => sum + Number(row.amount), 0);
  const spentThisMonth = transactions.filter((row) => row.sender_id === user.id && row.transaction_type !== "community_donation").reduce((sum, row) => sum + Number(row.amount), 0);
  const donatedThisMonth = transactions.filter((row) => row.sender_id === user.id && row.transaction_type === "community_donation").reduce((sum, row) => sum + Number(row.amount), 0);
  return { balance: Number(data.balance), earned: Number(data.total_earned), spent: Number(data.total_spent), community: Number(data.total_donated), earnedThisMonth, spentThisMonth, donatedThisMonth };
}

function serviceRow(service) {
  const category = Array.isArray(service.skill_categories) ? service.skill_categories[0] : service.skill_categories;
  const profile = Array.isArray(service.profiles) ? service.profiles[0] : service.profiles;
  return { id: service.id, userId: service.provider_id, title: service.title, description: service.description, duration: service.duration_minutes / 60, cost: Number(service.time_credits), availability: service.availability, location: service.location || "", mode: service.service_mode, category: category?.name || "", rating: 0, provider: profile ? { id: profile.id, fullName: profile.full_name, username: profile.username, avatarUrl: profile.avatar_url, location: profile.location || "", verified: profile.is_verified } : null };
}

export async function loadServices(filters = {}) {
  let request = requireBackend().from("services").select("id, provider_id, title, description, duration_minutes, time_credits, availability, location, service_mode, status, created_at, profiles!inner(id, full_name, username, avatar_url, location, is_verified), skill_categories!inner(name)").eq("status", "active").order("created_at", { ascending: false });
  if (filters.query?.trim()) request = request.or(`title.ilike.%${filters.query.trim()}%,description.ilike.%${filters.query.trim()}%`);
  if (filters.category && filters.category !== "All") request = request.eq("skill_categories.name", filters.category);
  const { data, error } = await request;
  if (error) throw new Error("Unable to load marketplace services.");
  return data.map(serviceRow);
}

export async function loadOwnedServices() {
  const user = await currentUser();
  const { data, error } = await requireBackend().from("services").select("id, provider_id, title, description, duration_minutes, time_credits, availability, location, service_mode, status, created_at, profiles!inner(id, full_name, username, avatar_url, location, is_verified), skill_categories!inner(name)").eq("provider_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load your services.");
  return data.map(serviceRow);
}

export async function loadService(id) {
  const { data, error } = await requireBackend().from("services").select("id, provider_id, title, description, duration_minutes, time_credits, availability, location, service_mode, profiles!inner(id, full_name, username, avatar_url, location, is_verified), skill_categories!inner(name)").eq("id", id).eq("status", "active").single();
  if (error) return null;
  return serviceRow(data);
}

export async function createService(payload) {
  const user = await currentUser();
  const client = requireBackend();
  const { data: category, error: categoryError } = await client.from("skill_categories").select("id").eq("name", payload.category).single();
  if (categoryError) throw new Error("That service category is unavailable.");
  const { data, error } = await client.from("services").insert({ provider_id: user.id, category_id: category.id, title: payload.title, description: payload.description, duration_minutes: Math.round(Number(payload.duration) * 60), time_credits: Number(payload.cost), availability: payload.availability, location: payload.location, service_mode: payload.mode === "Online" ? "online" : payload.mode === "In Person" ? "in_person" : "both", status: "active" }).select("id, title, status").single();
  if (error) throw new Error("Unable to publish your service.");
  return data;
}

export async function requestService(serviceId, message = "") {
  const { data, error } = await requireBackend().rpc("create_service_request", { p_service_id: serviceId, p_message: message });
  if (error) {
    if (/own service/i.test(error.message)) throw new Error("You cannot request your own service.");
    if (/already have/i.test(error.message)) throw new Error("You already have an open request for this service.");
    throw new Error("Unable to send the service request.");
  }
  return { ok: true, request: data };
}

export async function acceptRequest(id) {
  const { data, error } = await requireBackend().rpc("accept_service_request", { p_request_id: id });
  if (error) throw new Error("Unable to accept this request.");
  return { ok: true, session: data };
}

export async function declineRequest(id) {
  const { data, error } = await requireBackend().rpc("reject_service_request", { p_request_id: id });
  if (error) throw new Error("Unable to decline this request.");
  return { ok: true, request: data };
}

export async function completeServiceRequest(sessionId) {
  const { data, error } = await requireBackend().rpc("complete_service_session", { p_session_id: sessionId });
  if (error) {
    if (/insufficient time credits/i.test(error.message)) throw new Error("Insufficient Time Credits");
    if (/has not reached|has not ended/i.test(error.message)) throw new Error("The session has not ended yet.");
    throw new Error(error.message || "Unable to complete the service and transfer credits.");
  }
  return data;
}

export async function loadServiceSession(sessionId) {
  const { data, error } = await requireBackend().from("service_sessions").select("id, request_id, service_id, provider_id, requester_id, duration_minutes, scheduled_start_at, scheduled_end_at, actual_start_at, actual_end_at, status, video_room_id, provider_joined_at, requester_joined_at, completed_at, settled_at, services!inner(title, time_credits), provider:profiles!service_sessions_provider_id_fkey(full_name), requester:profiles!service_sessions_requester_id_fkey(full_name)").eq("id", sessionId).single();
  if (error) throw new Error("Unable to load this service session.");
  return data;
}

export async function joinServiceSession(sessionId) {
  const { data, error } = await requireBackend().rpc("join_service_session", { p_session_id: sessionId });
  if (error) throw new Error(error.message || "Unable to join this service session.");
  return data;
}

export async function getServerTime() {
  const startedAt = Date.now();
  const { data, error } = await requireBackend().rpc("get_server_time");
  const finishedAt = Date.now();
  if (error) throw new Error("Unable to synchronize the session timer.");
  return new Date(data).getTime() - Math.round((startedAt + finishedAt) / 2);
}

function transactionRow(row, userId) {
  const request = Array.isArray(row.service_requests) ? row.service_requests[0] : row.service_requests;
  const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;
  const receiver = Array.isArray(row.receiver) ? row.receiver[0] : row.receiver;
  const incoming = row.receiver_id === userId;
  return { id: row.id, type: row.transaction_type, amount: Number(row.amount), service: request?.services?.title || row.description || "Time credit transfer", person: incoming ? sender?.full_name || "TimeBank member" : receiver?.full_name || "TimeBank community", date: row.created_at, status: "Completed", incoming };
}

export async function loadTransactions(filter = "All") {
  const user = await currentUser();
  let request = requireBackend().from("transactions").select("id, sender_id, receiver_id, amount, transaction_type, description, created_at, sender:profiles!transactions_sender_id_fkey(full_name), receiver:profiles!transactions_receiver_id_fkey(full_name), service_requests(service_id, services(title))").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order("created_at", { ascending: false });
  const { data, error } = await request;
  if (error) throw new Error("Unable to load your transactions.");
  const rows = data.map((row) => transactionRow(row, user.id));
  if (filter === "Earned") return rows.filter((row) => row.incoming);
  if (filter === "Spent") return rows.filter((row) => !row.incoming && row.type !== "community_donation");
  if (filter === "Donated") return rows.filter((row) => row.type === "community_donation");
  return rows;
}

export async function loadTimeActivity(months = 6) {
  const user = await currentUser();
  const range = Math.max(1, Math.min(12, Number(months) || 6));
  const now = new Date();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (range - 1), 1));
  const { data, error } = await requireBackend()
    .from("transactions")
    .select("amount, sender_id, receiver_id, transaction_type, created_at")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .gte("created_at", cutoff.toISOString())
    .order("created_at", { ascending: true });
  if (error) throw new Error("Unable to load time activity.");

  const points = Array.from({ length: range }, (_, index) => {
    const date = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + index, 1));
    return { key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`, label: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), earned: 0, spent: 0 };
  });
  const byMonth = new Map(points.map((point) => [point.key, point]));
  data.forEach((transaction) => {
    const date = new Date(transaction.created_at);
    const point = byMonth.get(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
    if (!point) return;
    const amount = Number(transaction.amount) || 0;
    if (transaction.receiver_id === user.id) point.earned += amount;
    else if (transaction.sender_id === user.id) point.spent += amount;
  });
  return { points, totalEarned: points.reduce((sum, point) => sum + point.earned, 0), totalSpent: points.reduce((sum, point) => sum + point.spent, 0) };
}

export async function loadNotifications() {
  const user = await currentUser();
  const { data, error } = await requireBackend().from("notifications").select("id, title, message, notification_type, is_read, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load your notifications.");
  return data.map((row) => ({ id: row.id, title: row.title, body: row.message, type: row.notification_type, unread: !row.is_read, date: row.created_at }));
}

export async function loadReviews(userId) {
  const id = userId || (await currentUser()).id;
  const { data, error } = await requireBackend().from("reviews").select("id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, avatar_url)").eq("reviewee_id", id).order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load your reviews.");
  return data.map((row) => ({ id: row.id, rating: Number(row.rating), text: row.comment || "No written feedback.", user: { fullName: row.reviewer?.full_name || "TimeBank member", avatarUrl: row.reviewer?.avatar_url || "" } }));
}

export async function markNotificationsRead() {
  const user = await currentUser();
  const { error } = await requireBackend().from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  if (error) throw new Error("Unable to mark notifications as read.");
  return { ok: true };
}

export async function loadRequests() {
  const user = await currentUser();
  const { data, error } = await requireBackend().from("service_requests").select("id, status, requester_id, provider_id, message, requested_at, accepted_at, completed_at, services!inner(id, title, duration_minutes, time_credits), service_sessions(id, scheduled_start_at, scheduled_end_at, status, settled_at), requester:profiles!service_requests_requester_id_fkey(id, full_name, username, avatar_url), provider:profiles!service_requests_provider_id_fkey(id, full_name, username, avatar_url)").or(`requester_id.eq.${user.id},provider_id.eq.${user.id}`).order("requested_at", { ascending: false });
  if (error) throw new Error("Unable to load service requests.");
  return data.map((request) => {
    const participant = request.provider_id === user.id ? request.requester : request.provider;
    const session = Array.isArray(request.service_sessions) ? request.service_sessions[0] : request.service_sessions;
    return { id: request.id, status: request.status, isProvider: request.provider_id === user.id, from: { id: participant.id, fullName: participant.full_name, username: participant.username, avatarUrl: participant.avatar_url }, service: { id: request.services.id, title: request.services.title, duration: request.services.duration_minutes / 60, cost: Number(request.services.time_credits) }, session, hours: request.services.duration_minutes / 60, message: request.message || "", requestedAt: request.requested_at };
  });
}

export async function loadMatches() { return []; }

export async function loadCommunity() {
  const { data, error } = await requireBackend().from("community_time_pool").select("balance, total_donated, total_distributed").eq("id", true).single();
  if (error) throw new Error("Unable to load the community pool.");
  return { hours: Number(data.balance), donated: Number(data.total_donated), distributed: Number(data.total_distributed) };
}

export async function donateTime(amount) {
  const { data, error } = await requireBackend().rpc("donate_to_community_pool", { p_amount: Number(amount) });
  if (error) throw new Error(error.message || "Unable to donate Time Credits.");
  return { ok: true, pool: { hours: Number(data.balance), donated: Number(data.total_donated), distributed: Number(data.total_distributed) } };
}

export async function loadActivity() {
  const rows = await loadTransactions();
  const weekly = Array(7).fill(0);
  const monthly = Array(12).fill(0);
  rows.forEach((row) => {
    const date = new Date(row.date);
    weekly[(date.getDay() + 6) % 7] += row.amount;
    monthly[date.getMonth()] += row.amount;
  });
  return { weekly, monthly };
}

export async function loadDashboardStats() {
  const user = await currentUser();
  const client = requireBackend();
  const [{ count: activeServices, error: serviceError }, { data: requests, error: requestError }, { data: reviews, error: reviewError }] = await Promise.all([
    client.from("services").select("id", { count: "exact", head: true }).eq("provider_id", user.id).eq("status", "active"),
    client.from("service_requests").select("status, provider_id, requester_id").or(`provider_id.eq.${user.id},requester_id.eq.${user.id}`),
    client.from("reviews").select("rating").eq("reviewee_id", user.id)
  ]);
  if (serviceError || requestError || reviewError) throw new Error("Unable to load your dashboard statistics.");
  const involved = requests || [];
  const actionable = involved.filter((row) => row.provider_id === user.id);
  const answered = actionable.filter((row) => ["accepted", "rejected", "in_progress", "completed", "cancelled"].includes(row.status)).length;
  return { activeServices: activeServices || 0, completed: involved.filter((row) => row.status === "completed").length, averageRating: reviews?.length ? reviews.reduce((sum, row) => sum + Number(row.rating), 0) / reviews.length : null, responseRate: actionable.length ? Math.round((answered / actionable.length) * 100) : null };
}

export async function loadPlatformStats() {
  const client = requireBackend();
  const [members, services] = await Promise.all([client.from("profiles").select("id", { count: "exact", head: true }), client.from("services").select("id", { count: "exact", head: true }).eq("status", "active")]);
  if (members.error || services.error) throw new Error("Unable to load platform statistics.");
  return { members: members.count || 0, services: services.count || 0 };
}

export async function login(email, password) {
  const { data, error } = await requireBackend().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message.toLowerCase().includes("email not confirmed") ? "Confirm your email address before logging in." : "Unable to log in with those credentials.");
  return { ok: true, user: data.user };
}

export async function register(payload) {
  const { data, error } = await requireBackend().auth.signUp({ email: payload.email, password: payload.password, options: { data: { full_name: payload.fullName, username: payload.username, location: payload.location } } });
  if (error) throw new Error(error.message.toLowerCase().includes("already registered") ? "An account with this email already exists." : "Unable to create your account.");
  return { ok: true, user: data.user, session: data.session };
}

export function getSession() { return null; }

export async function logout() {
  if (isSupabaseConfigured) await supabase.auth.signOut();
}
