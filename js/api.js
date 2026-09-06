import * as mock from "./data.js";
import { isSupabaseConfigured, supabase } from "./supabase.js";

const delay = (ms = 280) => new Promise((resolve) => setTimeout(resolve, ms));

function clone(value) {
  return structuredClone(value);
}

export async function loadUserProfile(id = mock.currentUser.id) {
  if (isSupabaseConfigured) {
    const userId = id === mock.currentUser.id ? (await supabase.auth.getUser()).data.user?.id : id;
    if (!userId) throw new Error("Your session has expired. Please log in again.");
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, bio, location, is_verified")
      .eq("id", userId)
      .single();
    if (error) throw new Error("Unable to load your profile.");
    return {
      id: data.id,
      fullName: data.full_name,
      username: data.username,
      avatarUrl: data.avatar_url,
      bio: data.bio || "",
      location: data.location || "",
      verified: data.is_verified,
      skills: [],
      rating: 0,
      hoursGiven: 0,
      hoursReceived: 0,
      peopleHelped: 0,
      reputation: 0
    };
  }
  await delay();
  return clone(mock.users.find((user) => user.id === id) || mock.currentUser);
}

export async function loadWallet() {
  if (isSupabaseConfigured) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Your session has expired. Please log in again.");
    const { data, error } = await supabase
      .from("wallets")
      .select("balance, total_earned, total_spent, total_donated")
      .eq("user_id", user.id)
      .single();
    if (error) throw new Error("Unable to load your wallet.");
    return {
      balance: Number(data.balance),
      earned: Number(data.total_earned),
      spent: Number(data.total_spent),
      community: Number(data.total_donated),
      earnedThisWeek: 0,
      earnedThisMonth: 0
    };
  }
  await delay();
  const { balance, earned, spent, community, earnedThisWeek, earnedThisMonth } = mock.currentUser;
  return { balance, earned, spent, community, earnedThisWeek, earnedThisMonth };
}

export async function loadServices(filters = {}) {
  if (isSupabaseConfigured) {
    let request = supabase
      .from("services")
      .select(`
        id,
        provider_id,
        title,
        description,
        duration_minutes,
        time_credits,
        availability,
        location,
        service_mode,
        status,
        created_at,
        profiles!inner (id, full_name, username, avatar_url, location, is_verified),
        skill_categories!inner (name)
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (filters.query) {
      const value = filters.query.trim();
      request = request.or(`title.ilike.%${value}%,description.ilike.%${value}%`);
    }
    if (filters.category && filters.category !== "All") {
      request = request.eq("skill_categories.name", filters.category);
    }

    const { data, error } = await request;
    if (error) throw new Error("Unable to load marketplace services.");
    return data.map((service) => ({
      id: service.id,
      userId: service.provider_id,
      title: service.title,
      description: service.description,
      duration: service.duration_minutes / 60,
      cost: Number(service.time_credits),
      availability: service.availability,
      location: service.location || "",
      mode: service.service_mode,
      category: service.skill_categories.name,
      rating: 0,
      provider: {
        id: service.profiles.id,
        fullName: service.profiles.full_name,
        username: service.profiles.username,
        avatarUrl: service.profiles.avatar_url,
        location: service.profiles.location || "",
        verified: service.profiles.is_verified
      }
    }));
  }
  await delay();
  const query = (filters.query || "").toLowerCase();
  const category = filters.category || "All";
  return clone(mock.services).filter((service) => {
    const owner = mock.users.find((user) => user.id === service.userId);
    const haystack = `${service.title} ${service.description} ${owner?.fullName || ""}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesCategory = category === "All" || service.category === category;
    return matchesQuery && matchesCategory;
  });
}

export async function loadService(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("services")
      .select(`
        id,
        provider_id,
        title,
        description,
        duration_minutes,
        time_credits,
        availability,
        location,
        service_mode,
        profiles!inner (id, full_name, username, avatar_url, location, is_verified),
        skill_categories!inner (name)
      `)
      .eq("id", id)
      .eq("status", "active")
      .single();
    if (error) return null;
    return {
      id: data.id,
      userId: data.provider_id,
      title: data.title,
      description: data.description,
      duration: data.duration_minutes / 60,
      cost: Number(data.time_credits),
      availability: data.availability,
      location: data.location || "",
      mode: data.service_mode,
      category: data.skill_categories.name,
      rating: 0,
      provider: {
        id: data.profiles.id,
        fullName: data.profiles.full_name,
        username: data.profiles.username,
        avatarUrl: data.profiles.avatar_url,
        location: data.profiles.location || "",
        verified: data.profiles.is_verified,
        hoursGiven: 0,
        peopleHelped: 0,
        rating: 0
      }
    };
  }
  await delay();
  const service = mock.services.find((item) => item.id === id);
  if (!service) return null;
  const provider = mock.users.find((user) => user.id === service.userId);
  return clone({ ...service, provider });
}

export async function createService(payload) {
  if (isSupabaseConfigured) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Your session has expired. Please log in again.");

    const { data: category, error: categoryError } = await supabase
      .from("skill_categories")
      .select("id")
      .eq("name", payload.category)
      .single();
    if (categoryError) throw new Error("That service category is unavailable.");

    const { data, error } = await supabase
      .from("services")
      .insert({
        provider_id: user.id,
        category_id: category.id,
        title: payload.title,
        description: payload.description,
        duration_minutes: Math.round(Number(payload.duration) * 60),
        time_credits: Number(payload.cost),
        availability: payload.availability,
        location: payload.location,
        service_mode: payload.mode === "Online" ? "online" : "in_person",
        status: "active"
      })
      .select("id, title, status")
      .single();
    if (error) throw new Error("Unable to publish your service.");
    return data;
  }
  await delay(400);
  const created = {
    id: `s_${Date.now()}`,
    userId: mock.currentUser.id,
    rating: 0,
    ...payload
  };
  mock.services.unshift(created);
  return clone(created);
}

export async function requestService(serviceId, message = "") {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc("create_service_request", {
      p_service_id: serviceId,
      p_message: message
    });
    if (error) {
      if (error.message.toLowerCase().includes("own service")) {
        throw new Error("You cannot request your own service.");
      }
      if (error.message.toLowerCase().includes("already have")) {
        throw new Error("You already have an open request for this service.");
      }
      throw new Error("Unable to send the service request.");
    }
    return { ok: true, request: data };
  }
  await delay(400);
  const service = mock.services.find((item) => item.id === serviceId);
  mock.requests.unshift({
    id: `r_${Date.now()}`,
    status: "new",
    fromId: mock.currentUser.id,
    serviceId,
    hours: service?.duration || 1,
    message
  });
  return { ok: true };
}

export async function acceptRequest(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc("set_service_request_status", {
      p_request_id: id,
      p_status: "accepted"
    });
    if (error) throw new Error("Unable to accept this request.");
    return { ok: true, request: data };
  }
  await delay(320);
  const request = mock.requests.find((item) => item.id === id);
  if (request) request.status = "accepted";
  return { ok: true, request: clone(request) };
}

export async function declineRequest(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc("set_service_request_status", {
      p_request_id: id,
      p_status: "rejected"
    });
    if (error) throw new Error("Unable to decline this request.");
    return { ok: true, request: data };
  }
  await delay(250);
  const request = mock.requests.find((item) => item.id === id);
  if (request) request.status = "declined";
  return { ok: true };
}

export async function completeService() {
  await delay(350);
  return { ok: true };
}

export async function completeServiceRequest(requestId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc("complete_service_and_transfer", {
      p_request_id: requestId
    });
    if (error) throw new Error("Unable to complete the service and transfer credits.");
    return data;
  }
  return completeService();
}

export async function transferTimeCredits(amount, toUserId) {
  await delay(400);
  return { ok: true, amount, toUserId };
}

export async function donateTime(amount) {
  await delay(400);
  mock.communityPool.hours += Number(amount);
  mock.communityPool.donors += 1;
  mock.currentUser.balance = Number((mock.currentUser.balance - amount).toFixed(1));
  mock.currentUser.community += Number(amount);
  return { ok: true, pool: clone(mock.communityPool) };
}

export async function loadTransactions(filter = "All") {
  await delay();
  const rows = clone(mock.transactions);
  if (filter === "All") return rows;
  const key = filter.toLowerCase();
  return rows.filter((row) => row.type === key);
}

export async function loadNotifications() {
  await delay();
  return clone(mock.notifications);
}

export async function markNotificationsRead() {
  mock.notifications.forEach((item) => {
    item.unread = false;
  });
  return { ok: true };
}

export async function submitReview(payload) {
  await delay(300);
  mock.reviews.unshift({ id: `rv_${Date.now()}`, ...payload });
  return { ok: true };
}

export async function loadRequests() {
  if (isSupabaseConfigured) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Your session has expired. Please log in again.");
    const { data, error } = await supabase
      .from("service_requests")
      .select(`
        id,
        status,
        requester_id,
        provider_id,
        message,
        requested_at,
        services!inner (id, title, duration_minutes, time_credits),
        requester:profiles!service_requests_requester_id_fkey (id, full_name, username, avatar_url)
      `)
      .or(`requester_id.eq.${user.id},provider_id.eq.${user.id}`)
      .order("requested_at", { ascending: false });
    if (error) throw new Error("Unable to load service requests.");
    return data.map((request) => ({
      id: request.id,
      status: request.status === "pending" ? "new" : request.status,
      isProvider: request.provider_id === user.id,
      from: {
        id: request.requester.id,
        fullName: request.requester.full_name,
        username: request.requester.username,
        avatarUrl: request.requester.avatar_url
      },
      service: {
        id: request.services.id,
        title: request.services.title,
        duration: request.services.duration_minutes / 60,
        cost: Number(request.services.time_credits)
      },
      hours: request.services.duration_minutes / 60,
      message: request.message || ""
    }));
  }
  await delay();
  return clone(mock.requests).map((request) => ({
    ...request,
    from: mock.users.find((user) => user.id === request.fromId),
    service: mock.services.find((service) => service.id === request.serviceId)
  }));
}

export async function loadMatches() {
  await delay();
  return clone(mock.matches).map((match) => ({
    ...match,
    user: mock.users.find((user) => user.id === match.userId)
  }));
}

export async function loadCommunity() {
  await delay();
  return clone(mock.communityPool);
}

export async function login(email, password) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        throw new Error("Confirm your email address before logging in.");
      }
      throw new Error("Unable to log in with those credentials.");
    }
    localStorage.setItem("timebank.session", JSON.stringify({
      email: data.user.email,
      userId: data.user.id
    }));
    return { ok: true, user: data.user };
  }
  await delay(450);
  if (!email || !password) throw new Error("Enter email and password.");
  localStorage.setItem("timebank.session", JSON.stringify({ email, userId: mock.currentUser.id }));
  return { ok: true };
}

export async function register(payload) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          username: payload.username,
          location: payload.location
        }
      }
    });
    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        throw new Error("An account with this email already exists.");
      }
      throw new Error("Unable to create your account.");
    }
    if (data.session) {
      localStorage.setItem("timebank.session", JSON.stringify({
        email: data.user.email,
        userId: data.user.id
      }));
    }
    return { ok: true, user: data.user, session: data.session };
  }
  await delay(500);
  localStorage.setItem("timebank.session", JSON.stringify({ email: payload.email, userId: mock.currentUser.id }));
  return { ok: true };
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem("timebank.session") || "null");
  } catch {
    return null;
  }
}

export async function logout() {
  if (isSupabaseConfigured) await supabase.auth.signOut();
  localStorage.removeItem("timebank.session");
}

