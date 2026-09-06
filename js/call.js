import { completeServiceRequest, loadRequests } from "./api.js";
import { isSupabaseConfigured, supabase } from "./supabase.js";
import { mountChrome } from "./app.js";
import { toast } from "./ui.js";

const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await mountChrome({ app: true }))) return;

  const requestId = new URLSearchParams(window.location.search).get("request");
  const status = document.querySelector("[data-call-status]");
  const timer = document.querySelector("[data-call-timer]");
  const localVideo = document.querySelector("[data-local-video]");
  const remoteVideo = document.querySelector("[data-remote-video]");
  const leaveButton = document.querySelector("[data-leave]");
  if (!requestId) {
    status.textContent = "This call link is missing a request.";
    return;
  }

  let requests;
  try {
    requests = await loadRequests();
  } catch (error) {
    status.textContent = error.message;
    return;
  }
  const request = requests.find((item) => item.id === requestId);
  if (!request || !["accepted", "in_progress"].includes(request.status)) {
    status.textContent = "This service is not ready for a video call.";
    return;
  }

  const durationSeconds = Math.max(60, Math.round(request.hours * 60 * 60));
  const isProvider = request.isProvider;
  let peer;
  let channel;
  let timerStarted = false;
  let remaining = durationSeconds;
  let ending = false;
  let offerSent = false;
  const pendingCandidates = [];

  const closeCall = () => {
    peer?.close();
    localVideo.srcObject?.getTracks().forEach((track) => track.stop());
    remoteVideo.srcObject?.getTracks().forEach((track) => track.stop());
    channel?.unsubscribe();
    window.setTimeout(() => { window.location.href = "requests.html"; }, 1800);
  };

  const sendSignal = (type, data) => {
    channel?.send({ type: "broadcast", event: "signal", payload: { type, data } });
  };

  const startTimer = () => {
    if (timerStarted) return;
    timerStarted = true;
    status.textContent = "Call connected. Your time exchange is in progress.";
    const interval = window.setInterval(async () => {
      remaining -= 1;
      timer.textContent = formatTimer(Math.max(remaining, 0));
      if (remaining <= 0) {
        window.clearInterval(interval);
        if (isProvider) await finishService();
        else status.textContent = "Time is complete. Waiting for the provider to finalize the transfer.";
      }
    }, 1000);
  };

  const finishService = async () => {
    if (ending) return;
    ending = true;
    status.textContent = "Finalizing the time-credit transfer...";
    try {
      await completeServiceRequest(requestId);
      sendSignal("completed", {});
      status.textContent = "Service complete. Time Credits have been transferred.";
      closeCall();
    } catch (error) {
      ending = false;
      status.textContent = error.message;
      toast(error.message, "error");
    }
  };

  const flushCandidates = async () => {
    while (pendingCandidates.length && peer.remoteDescription) {
      await peer.addIceCandidate(pendingCandidates.shift());
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = stream;
  } catch {
    status.textContent = "Camera and microphone permission is required to join this call.";
    return;
  }

  peer = new RTCPeerConnection(rtcConfig);
  localVideo.srcObject.getTracks().forEach((track) => peer.addTrack(track, localVideo.srcObject));
  peer.ontrack = (event) => { remoteVideo.srcObject = event.streams[0]; };
  peer.onicecandidate = (event) => {
    if (event.candidate) sendSignal("candidate", event.candidate);
  };
  peer.onconnectionstatechange = () => {
    if (peer.connectionState === "connected") startTimer();
    if (["failed", "disconnected"].includes(peer.connectionState)) status.textContent = "The other participant has disconnected.";
  };

  if (!isSupabaseConfigured) {
    status.textContent = "Supabase must be configured to connect both participants.";
    return;
  }

  channel = supabase.channel(`timebank-call-${requestId}`, { config: { broadcast: { self: false } } });
  channel.on("broadcast", { event: "signal" }, async ({ payload }) => {
    try {
      if (payload.type === "offer" && !isProvider) {
        await peer.setRemoteDescription(payload.data);
        await flushCandidates();
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendSignal("answer", answer);
      } else if (payload.type === "ready" && isProvider && !offerSent) {
        offerSent = true;
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        sendSignal("offer", offer);
        status.textContent = "Waiting for the requester to join...";
      } else if (payload.type === "answer" && isProvider) {
        await peer.setRemoteDescription(payload.data);
        await flushCandidates();
      } else if (payload.type === "candidate") {
        if (peer.remoteDescription) await peer.addIceCandidate(payload.data);
        else pendingCandidates.push(payload.data);
      } else if (payload.type === "completed" && !isProvider) {
        status.textContent = "Service complete. The provider finalized the credit transfer.";
        closeCall();
      }
    } catch {
      status.textContent = "The video connection could not be established.";
    }
  });

  await channel.subscribe(async (event) => {
    if (event !== "SUBSCRIBED") return;
    if (isProvider) {
      status.textContent = "Waiting for the requester to join...";
    } else {
      sendSignal("ready", {});
      status.textContent = "Joining the provider's call...";
    }
  });

  leaveButton.addEventListener("click", () => {
    closeCall();
  });
});
