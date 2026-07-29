// ============================================
// GeoSphere - Profil Səhifəsi (profile.js)
// ============================================

if (sessionStorage.getItem("role") !== "student") {
  window.location.href = "index.html";
}

const studentId = sessionStorage.getItem("studentId");
const studentName = sessionStorage.getItem("studentName");

document.getElementById("profileName").textContent = studentName || "—";

async function loadProfile() {
  const { data: student } = await supabaseClient
    .from("students_public")
    .select("username")
    .eq("id", studentId)
    .maybeSingle();

  if (student) {
    document.getElementById("profileUsername").textContent = student.username;
  }

  const { data: testAttempts } = await supabaseClient
    .from("test_attempts")
    .select("*, lessons(title)")
    .eq("student_id", studentId)
    .order("attempt_number", { ascending: true });

  const { data: videoProgress } = await supabaseClient
    .from("video_progress")
    .select("*, lessons(title)")
    .eq("student_id", studentId);

  const container = document.getElementById("myStats");

  const lessonMap = {};

  (videoProgress || []).forEach(v => {
    const title = v.lessons ? v.lessons.title : "Naməlum mövzu";
    if (!lessonMap[title]) lessonMap[title] = { video: null, attempts: [] };
    lessonMap[title].video = v;
  });

  (testAttempts || []).forEach(a => {
    const title = a.lessons ? a.lessons.title : "Naməlum mövzu";
    if (!lessonMap[title]) lessonMap[title] = { video: null, attempts: [] };
    lessonMap[title].attempts.push(a);
  });

  const titles = Object.keys(lessonMap);

  if (titles.length === 0) {
    container.innerHTML = "<p>Hələ heç bir dərsə baxmamısan və ya test yazmamısan.</p>";
    return;
  }

  container.innerHTML = "";

  titles.forEach(title => {
    const info = lessonMap[title];

    let videoText = "İzləməmisən";
    if (info.video) {
      const watchedMin = Math.floor(info.video.watched_seconds / 60);
      const watchedSec = info.video.watched_seconds % 60;
      videoText = `${watchedMin} dəq ${String(watchedSec).padStart(2, "0")} san`;
      if (info.video.video_duration_seconds) {
        const durationMin = Math.floor(info.video.video_duration_seconds / 60);
        const durationSec = info.video.video_duration_seconds % 60;
        videoText += ` / ${durationMin} dəq ${String(durationSec).padStart(2, "0")} san`;
      }
    }

    const block = document.createElement("div");
    block.style.background = "white";
    block.style.borderRadius = "10px";
    block.style.padding = "14px";
    block.style.marginBottom = "12px";
    block.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)";

    let attemptsHtml = "";
    if (info.attempts.length === 0) {
      attemptsHtml = "<p>📝 Test: Hələ yazmamısan</p>";
    } else {
      attemptsHtml = "<p>📝 Test cəhdlərin:</p><ul>";
      info.attempts.forEach(a => {
        attemptsHtml += `<li>${a.attempt_number}-ci cəhd: ${a.correct_count} düz, ${a.total_questions - a.correct_count} səhv</li>`;
      });
      attemptsHtml += "</ul>";
    }

    block.innerHTML = `
      <h4 style="margin-bottom:6px;">📖 ${title}</h4>
      <p>🎬 Video: ${videoText}</p>
      ${attemptsHtml}
    `;
    container.appendChild(block);
  });
}

loadProfile();