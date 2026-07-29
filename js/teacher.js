// ============================================
// GeoSphere - Müəllim Paneli (teacher.js)
// ============================================

// Bu səhifəyə yalnız müəllim daxil ola bilər
if (sessionStorage.getItem("role") !== "teacher") {
  window.location.href = "index.html";
}

async function addStudent() {
  const fullName = document.getElementById("newFullName").value.trim();
  const username = document.getElementById("newUsername").value.trim();
  const password = document.getElementById("newPassword").value.trim();
  const messageEl = document.getElementById("addMessage");

  messageEl.textContent = "";

  if (!fullName || !username || !password) {
    messageEl.textContent = "Bütün sahələri doldur.";
    return;
  }

  const { error } = await supabaseClient.rpc("create_student", {
    p_full_name: fullName,
    p_username: username,
    p_password: password
  });

  if (error) {
    if (error.message.includes("duplicate")) {
      messageEl.textContent = "Bu istifadəçi adı artıq mövcuddur, başqa ad seç.";
    } else {
      messageEl.textContent = "Xəta baş verdi: " + error.message;
    }
    console.error(error);
    return;
  }

  messageEl.textContent = "✅ Şagird uğurla əlavə olundu.";
  document.getElementById("newFullName").value = "";
  document.getElementById("newUsername").value = "";
  document.getElementById("newPassword").value = "";

  loadStudents();
}

async function loadStudents() {
  const tbody = document.getElementById("studentsBody");
  tbody.innerHTML = "<tr><td colspan='4' style='padding:8px;'>Yüklənir...</td></tr>";

  const { data, error } = await supabaseClient
    .from("students_public")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML = "<tr><td colspan='4' style='padding:8px;'>Xəta baş verdi.</td></tr>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = "<tr><td colspan='4' style='padding:8px;'>Hələ şagird əlavə olunmayıb.</td></tr>";
    return;
  }

  tbody.innerHTML = "";

  data.forEach((student) => {
    const statusText = student.is_active ? "🟢 Aktiv" : "🔴 Bağlanıb";
    const actionText = student.is_active ? "Bağla" : "Aktivləşdir";

    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid #f0f0f0";
    row.innerHTML = `
      <td style="padding:8px;">${student.full_name}</td>
      <td style="padding:8px;">${student.username}</td>
      <td style="padding:8px;">${statusText}</td>
      <td style="padding:8px;">
        <button onclick="toggleActive('${student.id}', ${student.is_active})">${actionText}</button>
        <button onclick="resetPassword('${student.id}')">🔑 Şifrəni sıfırla</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function toggleActive(studentId, currentStatus) {
  const { error } = await supabaseClient.rpc("set_student_active", {
    p_student_id: studentId,
    p_active: !currentStatus
  });

  if (error) {
    alert("Xəta baş verdi: " + error.message);
    console.error(error);
    return;
  }

  loadStudents();
}

async function resetPassword(studentId) {
  const newPassword = window.prompt("Bu şagird üçün yeni şifrə yaz:");

  if (!newPassword) return;

  const { error } = await supabaseClient.rpc("reset_student_password", {
    p_student_id: studentId,
    p_new_password: newPassword
  });

  if (error) {
    alert("Xəta baş verdi: " + error.message);
    console.error(error);
    return;
  }

  alert("✅ Şifrə uğurla yeniləndi. Yeni şifrəni şagirdə söylə: " + newPassword);
}

// Səhifə açılanda şagird siyahısını yüklə
loadStudents();
loadStats();

// ============================================
// Statistika (test + video izləmə + reytinq)
// ============================================

async function loadStats() {
  const tbody = document.getElementById("statsBody");
  tbody.innerHTML = "<tr><td colspan='5' style='padding:8px;'>Yüklənir...</td></tr>";

  const { data: students, error: studentsError } = await supabaseClient
    .from("students_public")
    .select("*");

  if (studentsError || !students || students.length === 0) {
    tbody.innerHTML = "<tr><td colspan='5' style='padding:8px;'>Hələ şagird yoxdur.</td></tr>";
    return;
  }

  const statsList = [];

  for (const student of students) {
    // Test nəticələri (sualların mətni ilə birlikdə)
    const { data: testResults } = await supabaseClient
      .from("test_results")
      .select("*, questions(question_text, correct_option, explanation_text, explanation_video_url, question_type, option_a, option_b, option_c, option_d, option_e, lesson_id, lessons(title))")
      .eq("student_id", student.id);

    // Test cəhdləri (mövzu adı ilə birlikdə)
    const { data: testAttempts } = await supabaseClient
      .from("test_attempts")
      .select("*, lessons(title)")
      .eq("student_id", student.id)
      .order("attempt_number", { ascending: true });

    // Video izləmə (mövzu adı ilə birlikdə)
    const { data: videoProgress } = await supabaseClient
      .from("video_progress")
      .select("*, lessons(title)")
      .eq("student_id", student.id);

    const totalQuestions = testResults ? testResults.length : 0;
    const correctCount = testResults ? testResults.filter(r => r.is_correct).length : 0;
    const testPercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : null;

    let videoPercent = null;
    if (videoProgress && videoProgress.length > 0) {
      const percents = videoProgress
        .filter(v => v.video_duration_seconds > 0)
        .map(v => (v.watched_seconds / v.video_duration_seconds) * 100);
      if (percents.length > 0) {
        videoPercent = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);
      }
    }

    statsList.push({
      student,
      testPercent,
      videoPercent,
      correctCount,
      totalQuestions,
      testResults: testResults || [],
      testAttempts: testAttempts || [],
      videoProgress: videoProgress || []
    });
  }

  // Reytinq: test nəticəsinə görə sırala (yüksəkdən aşağıya, olmayanlar sona)
  statsList.sort((a, b) => (b.testPercent ?? -1) - (a.testPercent ?? -1));

  tbody.innerHTML = "";

  statsList.forEach((item, index) => {
    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid #f0f0f0";
    row.innerHTML = `
      <td style="padding:8px;">${index + 1}</td>
      <td style="padding:8px;">${item.student.full_name}</td>
      <td style="padding:8px;">${item.testPercent !== null ? `${item.correctCount} düz, ${item.totalQuestions - item.correctCount} səhv (%${item.testPercent})` : "Hələ test yoxdur"}</td>
      <td style="padding:8px;">${item.videoPercent !== null ? "%" + item.videoPercent : "—"}</td>
      <td style="padding:8px;">
        <button onclick="toggleDetails('${item.student.id}')">Bax</button>
        <a href="report.html?studentId=${item.student.id}">
          <button>📄 Hesabat</button>
        </a>
      </td>
    `;
    tbody.appendChild(row);

    // Detallar üçün gizli sıra
    const detailRow = document.createElement("tr");
    detailRow.id = `details_${item.student.id}`;
    detailRow.style.display = "none";
    const detailCell = document.createElement("td");
    detailCell.colSpan = 5;
    detailCell.style.padding = "12px";
    detailCell.style.background = "#f9f9f9";
    detailCell.innerHTML = buildDetailHtml(item);
    detailRow.appendChild(detailCell);
    tbody.appendChild(detailRow);
  });
}

function buildDetailHtml(item) {
  // Mövzu üzrə qruplaşdırma (video + bütün cəhdlər)
  const lessonMap = {};

  item.videoProgress.forEach(v => {
    const title = v.lessons ? v.lessons.title : "Naməlum mövzu";
    if (!lessonMap[title]) lessonMap[title] = { video: null, attempts: [] };
    lessonMap[title].video = v;
  });

  item.testAttempts.forEach(a => {
    const title = a.lessons ? a.lessons.title : "Naməlum mövzu";
    if (!lessonMap[title]) lessonMap[title] = { video: null, attempts: [] };
    lessonMap[title].attempts.push(a);
  });

  const titles = Object.keys(lessonMap);

  if (titles.length === 0) {
    return `<p style="color:#666;">Bu şagird hələ heç bir dərsə baxmayıb və ya test yazmayıb.</p>`;
  }

  let html = "";

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
      <div style="background:white; border-radius:10px; padding:14px; margin-bottom:12px; border:1px solid #eee;">
        <h4 style="margin-bottom:6px;">📖 ${title}</h4>
        <p>🎬 Video: ${videoText}</p>
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

  return html;
}

function toggleDetails(studentId) {
  const row = document.getElementById(`details_${studentId}`);
  row.style.display = (row.style.display === "none") ? "table-row" : "none";
}