// ============================================
// GeoSphere - Valideyn Hesabatı (report.js)
// ============================================

if (sessionStorage.getItem("role") !== "teacher") {
  window.location.href = "index.html";
}

const params = new URLSearchParams(window.location.search);
const studentId = params.get("studentId");

async function loadReport() {
  const container = document.getElementById("reportContainer");

  if (!studentId) {
    container.innerHTML = "<p>Şagird tapılmadı.</p>";
    return;
  }

  // Bütün şagirdləri çək (reytinq üçün)
  const { data: allStudents } = await supabaseClient
    .from("students_public")
    .select("*");

  const { data: currentStudent } = await supabaseClient
    .from("students_public")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (!currentStudent) {
    container.innerHTML = "<p>Şagird tapılmadı.</p>";
    return;
  }

  // Bütün şagirdlərin test faizini hesabla (reytinq üçün)
  const rankings = [];
  for (const s of allStudents) {
    const { data: results } = await supabaseClient
      .from("test_results")
      .select("is_correct")
      .eq("student_id", s.id);

    const total = results ? results.length : 0;
    const correct = results ? results.filter(r => r.is_correct).length : 0;
    const percent = total > 0 ? (correct / total) * 100 : -1;

    rankings.push({ id: s.id, name: s.full_name, percent });
  }

  rankings.sort((a, b) => b.percent - a.percent);
  const rank = rankings.findIndex(r => r.id === studentId) + 1;
  const totalStudents = rankings.length;

  // Cari şagirdin video və test məlumatları
  const { data: testAttempts } = await supabaseClient
    .from("test_attempts")
    .select("*, lessons(title)")
    .eq("student_id", studentId)
    .order("attempt_number", { ascending: true });

  const { data: videoProgress } = await supabaseClient
    .from("video_progress")
    .select("*, lessons(title)")
    .eq("student_id", studentId);

  // Mövzu üzrə qruplaşdırma
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

  const today = new Date().toLocaleDateString("az-AZ");

  let html = `
    <h1>📊 Şagird Hesabatı</h1>
    <div style="background:white; border-radius:12px; padding:20px; margin-bottom:20px; box-shadow:0 2px 10px rgba(0,0,0,0.06);">
      <p><strong>Ad Soyad:</strong> ${currentStudent.full_name}</p>
      <p><strong>Tarix:</strong> ${today}</p>
      <p><strong>Sinifdəki reytinqi:</strong> ${rank} / ${totalStudents}</p>
    </div>
  `;

  if (titles.length === 0) {
    html += `<p>Bu şagird hələ heç bir dərsə baxmayıb və ya test yazmayıb.</p>`;
  } else {
    titles.forEach(title => {
      const info = lessonMap[title];

      let videoText = "İzləməyib";
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

      html += `
        <div style="background:white; border-radius:10px; padding:14px; margin-bottom:12px; box-shadow:0 2px 10px rgba(0,0,0,0.06);">
          <h3 style="margin-bottom:6px;">📖 ${title}</h3>
          <p>🎬 Video izləmə: ${videoText}</p>
      `;

      if (info.attempts.length === 0) {
        html += `<p>📝 Test: Hələ yazmayıb</p>`;
      } else {
        html += `<p>📝 Test cəhdləri:</p><ul>`;
        info.attempts.forEach(a => {
          html += `<li>${a.attempt_number}-ci cəhd: ${a.correct_count} düz, ${a.total_questions - a.correct_count} səhv</li>`;
        });
        html += `</ul>`;
      }

      html += `</div>`;
    });
  }

  container.innerHTML = html;

  // ---------- Göndərmək üçün sadə mətn xülasəsi hazırlamaq ----------
  let textSummary = `GeoSphere Hesabatı\n`;
  textSummary += `Ad Soyad: ${currentStudent.full_name}\n`;
  textSummary += `Tarix: ${today}\n`;
  textSummary += `Sinifdəki reytinqi: ${rank} / ${totalStudents}\n\n`;

  if (titles.length === 0) {
    textSummary += `Hələ heç bir dərsə baxmayıb və ya test yazmayıb.\n`;
  } else {
    titles.forEach(title => {
      const info = lessonMap[title];
      textSummary += `📖 ${title}\n`;

      if (info.video) {
        const watchedMin = Math.floor(info.video.watched_seconds / 60);
        const watchedSec = info.video.watched_seconds % 60;
        textSummary += `  Video: ${watchedMin} dəq ${String(watchedSec).padStart(2, "0")} san`;
        if (info.video.video_duration_seconds) {
          const durationMin = Math.floor(info.video.video_duration_seconds / 60);
          const durationSec = info.video.video_duration_seconds % 60;
          textSummary += ` / ${durationMin} dəq ${String(durationSec).padStart(2, "0")} san`;
        }
        textSummary += `\n`;
      } else {
        textSummary += `  Video: İzləməyib\n`;
      }

      if (info.attempts.length === 0) {
        textSummary += `  Test: Hələ yazmayıb\n`;
      } else {
        info.attempts.forEach(a => {
          textSummary += `  ${a.attempt_number}-ci cəhd: ${a.correct_count} düz, ${a.total_questions - a.correct_count} səhv\n`;
        });
      }
      textSummary += `\n`;
    });
  }

  window.reportSummaryText = textSummary;
}

function sendWhatsapp() {
  const text = window.reportSummaryText || "Hesabat hazırlanır, bir az gözlə.";
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

function sendEmail() {
  const text = window.reportSummaryText || "Hesabat hazırlanır, bir az gözlə.";
  const subject = "GeoSphere - Şagird Hesabatı";
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

loadReport();