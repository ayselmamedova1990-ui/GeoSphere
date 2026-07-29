// ============================================
// GeoSphere - Dərs Səhifəsi (lesson.js)
// ============================================

if (sessionStorage.getItem("role") !== "student") {
  window.location.href = "index.html";
}

const params = new URLSearchParams(window.location.search);
const lessonId = params.get("lessonId");
const studentId = sessionStorage.getItem("studentId");

let ytPlayer = null;
let progressRowId = null;
let maxWatchedSeconds = 0;
let videoDuration = 0;
let trackingInterval = null;

// ---------- Dərs məlumatını yükləmək ----------
async function loadLesson() {
  if (!lessonId) return;

  const { data: lesson, error } = await supabaseClient
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .maybeSingle();

  if (error || !lesson) {
    document.getElementById("lessonTitle").textContent = "Dərs tapılmadı";
    console.error(error);
    return;
  }

  document.getElementById("lessonTitle").textContent = lesson.title;

  // PDF varsa göstər
  if (lesson.pdf_url) {
    document.getElementById("pdfList").innerHTML =
      `<a href="${lesson.pdf_url}" target="_blank"><button>📄 PDF-i aç</button></a>`;
  }

  // Əvvəlki izləmə məlumatını çək
  await loadPreviousProgress();

  // Video ID-ni çıxar (embed linkindən)
  if (lesson.video_url) {
    const match = lesson.video_url.match(/embed\/([a-zA-Z0-9_-]+)/);
    const videoId = match ? match[1] : null;

    if (videoId) {
      createPlayer(videoId);
    }
  }
}

// ---------- Əvvəlki izləmə məlumatını yükləmək ----------
async function loadPreviousProgress() {
  const { data, error } = await supabaseClient
    .from("video_progress")
    .select("*")
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (!error && data) {
    progressRowId = data.id;
    maxWatchedSeconds = data.watched_seconds || 0;
  }
}

// ---------- YouTube player yaratmaq ----------
function createPlayer(videoId) {
  ytPlayer = new YT.Player("player", {
    height: "450",
    width: "800",
    videoId: videoId,
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  videoDuration = Math.round(ytPlayer.getDuration());
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = setInterval(saveProgress, 5000);
  } else {
    if (trackingInterval) clearInterval(trackingInterval);
  }
}

// ---------- İzləmə vaxtını yadda saxlamaq ----------
async function saveProgress() {
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== "function") return;

  const currentTime = Math.round(ytPlayer.getCurrentTime());

  if (currentTime > maxWatchedSeconds) {
    maxWatchedSeconds = currentTime;
  }

  if (!videoDuration) {
    videoDuration = Math.round(ytPlayer.getDuration());
  }

  if (progressRowId) {
    await supabaseClient
      .from("video_progress")
      .update({
        watched_seconds: maxWatchedSeconds,
        video_duration_seconds: videoDuration,
        updated_at: new Date().toISOString()
      })
      .eq("id", progressRowId);
  } else {
    const { data, error } = await supabaseClient
      .from("video_progress")
      .insert({
        student_id: studentId,
        lesson_id: lessonId,
        watched_seconds: maxWatchedSeconds,
        video_duration_seconds: videoDuration
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      progressRowId = data.id;
    }
  }
}

function goToTest() {
  window.location.href = `test.html?lessonId=${lessonId}`;
}

// YouTube API hazır olanda çağırılır (API skriptinin özü çağırır)
function onYouTubeIframeAPIReady() {
  loadLesson();
}

// Əgər API artıq yüklənibsə (nadir hal) birbaşa çağır
if (window.YT && window.YT.Player) {
  loadLesson();
}