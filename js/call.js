import { completeServiceRequest, getServerTime, joinServiceSession, loadServiceSession } from "./api.js";
import { isSupabaseConfigured, supabase } from "./supabase.js";
import { mountChrome } from "./app.js";
import { toast } from "./ui.js";

const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

function formatTimer(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await mountChrome({ app: true }))) return;

  const sessionId = new URLSearchParams(window.location.search).get("session");
  const status = document.querySelector("[data-call-status]");
  const timer = document.querySelector("[data-call-timer]");
  const title = document.querySelector("[data-call-title]");
  const participants = document.querySelector("[data-call-participants]");
  const duration = document.querySelector("[data-call-duration]");
  const windowLabel = document.querySelector("[data-call-window]");
  const localVideo = document.querySelector("[data-local-video]");
  const remoteVideo = document.querySelector("[data-remote-video]");
  const leaveButton = document.querySelector("[data-leave]");
  const micButton = document.querySelector("[data-toggle-mic]");
  const cameraButton = document.querySelector("[data-toggle-camera]");
  const audioButton = document.querySelector("[data-enable-audio]");
  if (!sessionId || !isSupabaseConfigured) {
    status.textContent = "A configured private session link is required.";
    return;
  }

  try {
    let session = await loadServiceSession(sessionId);
    const clockOffset = await getServerTime();
    session = { ...session, ...(await joinServiceSession(sessionId)) };
    title.textContent = session.service?.title || "TimeBank session";
    participants.textContent = `${session.provider?.full_name || "Provider"} and ${session.requester?.full_name || "Requester"}`;
    duration.textContent = `Duration: ${session.duration_minutes} minutes`;
    windowLabel.textContent = `Scheduled: ${new Date(session.scheduled_start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(session.scheduled_end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    status.textContent = "Preparing your private session...";

    const currentUser = (await supabase.auth.getUser()).data.user;
    const isProvider = session.provider_id === currentUser?.id;
    const peer = new RTCPeerConnection(rtcConfig);
    const channel = supabase.channel(`timebank-call-${session.video_room_id}`, { config: { broadcast: { self: false } } });
    const pendingCandidates = [];
    const pendingSignals = [];
    let signalingReady = false;
    let offerSent = false;
    let finishing = false;
    let timerHandle;

    const now = () => Date.now() + clockOffset;
    const stopMedia = () => {
      peer.close();
      localVideo.srcObject?.getTracks().forEach((track) => track.stop());
      remoteVideo.srcObject?.getTracks().forEach((track) => track.stop());
    };
    const closeMedia = () => {
      window.clearInterval(timerHandle);
      stopMedia();
      channel.unsubscribe();
    };
    const exit = () => {
      closeMedia();
      window.location.href = "requests.html";
    };
    const sendSignal = async (type, data) => {
      const signal = { type, data };
      if (!signalingReady) {
        pendingSignals.push(signal);
        return;
      }
      const result = await channel.send({
        type: "broadcast",
        event: "signal",
        payload: signal
      });
      if (result !== "ok") console.warn("Realtime signal was not delivered:", result);
    };
    const flushSignals = async () => {
      signalingReady = true;
      while (pendingSignals.length) {
        const signal = pendingSignals.shift();
        await sendSignal(signal.type, signal.data);
      }
    };
    const finish = async () => {
      if (finishing) return;
      finishing = true;
      window.clearInterval(timerHandle);
      stopMedia();
      status.textContent = "Session complete. Settling Time Credits securely...";
      try {
        await completeServiceRequest(sessionId);
        await sendSignal("completed", {});
        channel.unsubscribe();
        status.textContent = "Session completed. Time Credits have been settled.";
        window.setTimeout(exit, 1800);
      } catch (error) {
        finishing = false;
        status.textContent = error.message;
        leaveButton.textContent = "Retry settlement";
        leaveButton.onclick = finish;
        toast(error.message, "error");
      }
    };
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((new Date(session.scheduled_end_at).getTime() - now()) / 1000));
      timer.textContent = formatTimer(remaining);
      if (remaining === 0) finish();
    };
    const flushCandidates = async () => {
      while (pendingCandidates.length && peer.remoteDescription) {
        await peer.addIceCandidate(pendingCandidates.shift());
      }
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (error) {
      const messages = {
        NotAllowedError: "Camera and microphone permission was denied.",
        NotFoundError: "No camera or microphone was detected.",
        NotReadableError: "The camera or microphone is already in use.",
        SecurityError: "Camera and microphone require localhost or HTTPS."
      };
      throw new Error(messages[error.name] || "Unable to access the camera and microphone.");
    }
    localVideo.muted = true;
    localVideo.srcObject = stream;
    await localVideo.play().catch(() => {});
    console.debug("Local stream acquired", {
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length
    });
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    console.debug("Local tracks added to peer connection");
    peer.ontrack = (event) => {
      const remoteStream = event.streams[0] || remoteVideo.srcObject || new MediaStream();
      if (!event.streams[0]) remoteStream.addTrack(event.track);
      remoteVideo.muted = false;
      remoteVideo.volume = 1;
      remoteVideo.srcObject = remoteStream;
      remoteVideo.play().catch(() => {
        audioButton.hidden = false;
        status.textContent = "Remote video connected. Enable audio to hear the other participant.";
      });
      console.debug("Remote track received", {
        kind: event.track.kind,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length
      });
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.debug("ICE candidate generated");
        sendSignal("candidate", event.candidate);
      }
    };
    peer.onconnectionstatechange = () => {
      console.debug("Peer connection state", peer.connectionState, peer.iceConnectionState, peer.signalingState);
      if (peer.connectionState === "connected") status.textContent = "Connected. Your TimeBank session is active.";
      if (["failed", "disconnected"].includes(peer.connectionState)) status.textContent = "Connection interrupted. The server timer is still running.";
    };
    peer.oniceconnectionstatechange = () => console.debug("ICE connection state", peer.iceConnectionState);
    peer.onsignalingstatechange = () => console.debug("Signaling state", peer.signalingState);
    micButton.addEventListener("click", () => {
      const track = stream.getAudioTracks()[0];
      if (!track) return;
      track.enabled = !track.enabled;
      micButton.textContent = track.enabled ? "Mute microphone" : "Unmute microphone";
    });
    cameraButton.addEventListener("click", () => {
      const track = stream.getVideoTracks()[0];
      if (!track) return;
      track.enabled = !track.enabled;
      cameraButton.textContent = track.enabled ? "Turn camera off" : "Turn camera on";
    });
    audioButton.addEventListener("click", async () => {
      await remoteVideo.play();
      audioButton.hidden = true;
    });

    channel.on("broadcast", { event: "signal" }, async ({ payload }) => {
      try {
        if (payload.type === "ready" && isProvider && !offerSent) {
          offerSent = true;
          const offer = await peer.createOffer();
          console.debug("Offer created");
          await peer.setLocalDescription(offer);
          await sendSignal("offer", offer);
          console.debug("Offer sent");
        } else if (payload.type === "offer" && !isProvider) {
          console.debug("Offer received");
          await peer.setRemoteDescription(payload.data);
          console.debug("Remote description set");
          await flushCandidates();
          const answer = await peer.createAnswer();
          console.debug("Answer created");
          await peer.setLocalDescription(answer);
          await sendSignal("answer", answer);
          console.debug("Answer sent");
        } else if (payload.type === "answer" && isProvider) {
          console.debug("Answer received");
          await peer.setRemoteDescription(payload.data);
          console.debug("Remote description set");
          await flushCandidates();
        } else if (payload.type === "candidate") {
          console.debug("ICE candidate received");
          if (peer.remoteDescription) await peer.addIceCandidate(payload.data);
          else pendingCandidates.push(payload.data);
        } else if (payload.type === "completed") {
          window.clearInterval(timerHandle);
          status.textContent = "Session completed. Time Credits have been settled.";
          closeMedia();
          window.setTimeout(() => { window.location.href = "requests.html"; }, 1800);
        }
      } catch {
        status.textContent = "The video connection could not be established.";
      }
    });

    await channel.subscribe((event) => {
      if (event !== "SUBSCRIBED") return;
      flushSignals();
      if (isProvider) status.textContent = "Waiting for the requester to join...";
      else sendSignal("ready", {});
    });

    timerHandle = window.setInterval(tick, 1000);
    tick();
    leaveButton.addEventListener("click", exit);
  } catch (error) {
    status.textContent = error.message || "Unable to join this private session.";
  }
});
