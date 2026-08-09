// ============================================
// GeoSphere - Admin Paneli (admin.js)
// ============================================

// Bu səhifəyə yalnız müəllim daxil ola bilər
if (sessionStorage.getItem("role") !== "teacher") {
  window.location.href = "index.html";
}

// ---------- Bölmə yaratmaq ----------
async function createSection() {
  const name = document.getElementById("sectionName").value.trim();
  const messageEl = document.getElementById("sectionMessage");
  messageEl.textContent = "";

  if (!name) {
    messageEl.textContent = "Bölmənin adını yaz.";
    return;
  }

  const { error } = await supabaseClient.from("sections").insert({ name: name });

  if (error) {
    messageEl.textContent = "Xəta baş verdi: " + error.message;
    console.error(error);
    return;
  }

  messageEl.textContent = "✅ Bölmə uğurla yaradıldı.";
  document.getElementById("sectionName").value = "";
  loadSectionsDropdown();
  loadSectionsList();
}

// ---------- Mövcud bölmələrin siyahısı (sil / adını dəyiş) ----------
async function loadSectionsList() {
  const container = document.getElementById("sectionsListContainer");
  container.innerHTML = "<p>Yüklənir...</p>";

  const { data, error } = await supabaseClient
    .from("sections")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    container.innerHTML = "<p>Xəta baş verdi.</p>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Hələ bölmə yoxdur.</p>";
    return;
  }

  container.innerHTML = "";

  data.forEach((section) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "8px 0";
    row.style.borderBottom = "1px solid #eee";
    row.innerHTML = `
      <span>📁 ${section.name}</span>
      <span>
        <button onclick="renameSection('${section.id}', '${section.name.replace(/'/g, "\\'")}')">✏️ Adını dəyiş</button>
        <button onclick="deleteSection('${section.id}')">🗑️ Sil</button>
      </span>
    `;
    container.appendChild(row);
  });
}

async function renameSection(sectionId, currentName) {
  const newName = window.prompt("Yeni bölmə adı:", currentName);
  if (!newName || newName.trim() === "") return;

  const { error } = await supabaseClient
    .from("sections")
    .update({ name: newName.trim() })
    .eq("id", sectionId);

  if (error) {
    alert("Xəta baş verdi: " + error.message);
    console.error(error);
    return;
  }

  await loadSectionsList();
  await loadSectionsDropdown();
}

async function deleteSection(sectionId) {
  const confirmDelete = window.confirm(
    "Bu bölməni silmək istədiyinə əminsən? Bu bölməyə aid BÜTÜN mövzular, suallar və şagird nəticələri də silinəcək. Bu əməliyyat geri qaytarılmır!"
  );
  if (!confirmDelete) return;

  const { error } = await supabaseClient
    .from("sections")
    .delete()
    .eq("id", sectionId);

  if (error) {
    alert("Xəta baş verdi: " + error.message);
    console.error(error);
    return;
  }

  await loadSectionsList();
  await loadSectionsDropdown();
  await loadLessonsList();
  document.getElementById("questionsListContainer").innerHTML = "<p>Mövzu seç.</p>";
}

// ---------- Bölmələri dropdown-a yükləmək ----------
async function loadSectionsDropdown() {
  const select = document.getElementById("lessonSection");
  select.innerHTML = "<option value=''>Yüklənir...</option>";

  const { data, error } = await supabaseClient
    .from("sections")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    select.innerHTML = "<option value=''>Xəta baş verdi</option>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    select.innerHTML = "<option value=''>Əvvəlcə bölmə yarat</option>";
    return;
  }

  select.innerHTML = "";
  data.forEach((section) => {
    const option = document.createElement("option");
    option.value = section.id;
    option.textContent = section.name;
    select.appendChild(option);
  });
}

// ---------- Mövzu (dərs) yaratmaq ----------
let editingLessonId = null;

async function createLesson() {
  const sectionId = document.getElementById("lessonSection").value;
  const title = document.getElementById("lessonName").value.trim();
  const videoUrl = document.getElementById("lessonVideo").value.trim();
  const pdfFile = document.getElementById("lessonPdf").files[0];
  const messageEl = document.getElementById("lessonMessage");

  messageEl.textContent = "";

  if (!sectionId) {
    messageEl.textContent = "Bölmə seç.";
    return;
  }

  if (!title) {
    messageEl.textContent = "Mövzunun adını yaz.";
    return;
  }

  messageEl.textContent = "Yüklənir, gözlə...";

  let pdfUrl = undefined; // undefined = köhnə PDF-ə toxunma (yeniləmə rejimində)

  // Əgər yeni PDF seçilibsə, Supabase Storage-a yüklə
  if (pdfFile) {
    const safeName = pdfFile.name
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[əƏ]/g, "e")
  .replace(/[ıI]/g, "i")
  .replace(/[öÖ]/g, "o")
  .replace(/[üÜ]/g, "u")
  .replace(/[şŞ]/g, "s")
  .replace(/[ğĞ]/g, "g")
  .replace(/[çÇ]/g, "c")
  .replace(/[^a-zA-Z0-9._-]/g, "_");
const fileName = `pdf_${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from("upload")
      .upload(fileName, pdfFile);

    if (uploadError) {
      messageEl.textContent = "PDF yüklənərkən xəta: " + uploadError.message;
      console.error(uploadError);
      return;
    }

    const { data: urlData } = supabaseClient
      .storage
      .from("upload")
      .getPublicUrl(fileName);

    pdfUrl = urlData.publicUrl;
  } else if (!editingLessonId) {
    pdfUrl = null; // yeni yaratmada, PDF seçilməyibsə boş qalsın
  }

  let error, newLesson;

  if (editingLessonId) {
    // ---- Yeniləmə rejimi ----
    const updatePayload = {
      section_id: sectionId,
      title: title,
      video_url: videoUrl || null
    };
    if (pdfUrl !== undefined) updatePayload.pdf_url = pdfUrl;

    ({ error } = await supabaseClient
      .from("lessons")
      .update(updatePayload)
      .eq("id", editingLessonId));
  } else {
    // ---- Yeni yaratma rejimi ----
    ({ data: newLesson, error } = await supabaseClient
      .from("lessons")
      .insert({
        section_id: sectionId,
        title: title,
        video_url: videoUrl || null,
        pdf_url: pdfUrl
      })
      .select()
      .maybeSingle());
  }

  if (error) {
    messageEl.textContent = "Xəta baş verdi: " + error.message;
    console.error(error);
    return;
  }

  messageEl.textContent = editingLessonId ? "✅ Mövzu uğurla yeniləndi." : "✅ Mövzu uğurla yaradıldı.";

  const wasEditing = editingLessonId;
  cancelEditLesson();

  await loadLessonsDropdown();
  await loadLessonsList();

  // Yeni yaradılan mövzunu test sualı dropdown-unda avtomatik seç
  if (newLesson) {
    document.getElementById("questionLesson").value = newLesson.id;
    loadQuestionsListForLesson(newLesson.id);
  } else if (wasEditing) {
    document.getElementById("questionLesson").value = wasEditing;
    loadQuestionsListForLesson(wasEditing);
  }
}

// ---------- Mövzunu redaktə üçün formaya yükləmək ----------
async function editLesson(lessonId) {
  const { data: lesson, error } = await supabaseClient
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .maybeSingle();

  if (error || !lesson) {
    alert("Mövzu tapılmadı.");
    console.error(error);
    return;
  }

  editingLessonId = lesson.id;

  document.getElementById("lessonSection").value = lesson.section_id;
  document.getElementById("lessonName").value = lesson.title;
  document.getElementById("lessonVideo").value = lesson.video_url || "";
  document.getElementById("lessonPdf").value = "";

  document.getElementById("lessonSubmitBtn").textContent = "💾 Mövzunu yenilə";
  document.getElementById("lessonCancelEditBtn").style.display = "inline-block";

  const pdfNote = lesson.pdf_url
    ? `Hazırkı PDF: <a href="${lesson.pdf_url}" target="_blank">bax</a> (dəyişmək istəmirsənsə fayl seçmə)`
    : "Hazırda PDF yoxdur";
  document.getElementById("lessonMessage").innerHTML = pdfNote;

  window.scrollTo({ top: document.querySelector(".admin-box").offsetTop, behavior: "smooth" });
}

function cancelEditLesson() {
  editingLessonId = null;
  document.getElementById("lessonSubmitBtn").textContent = "📚 Mövzunu yarat";
  document.getElementById("lessonCancelEditBtn").style.display = "none";
  document.getElementById("lessonName").value = "";
  document.getElementById("lessonVideo").value = "";
  document.getElementById("lessonPdf").value = "";
  document.getElementById("lessonMessage").textContent = "";
}

// ---------- Mövcud mövzuların siyahısı (sil / adını dəyiş) ----------
async function loadLessonsList() {
  const container = document.getElementById("lessonsListContainer");
  container.innerHTML = "<p>Yüklənir...</p>";

  const { data, error } = await supabaseClient
    .from("lessons")
    .select("*, sections(name)")
    .order("created_at", { ascending: true });

  if (error) {
    container.innerHTML = "<p>Xəta baş verdi.</p>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Hələ mövzu yoxdur.</p>";
    return;
  }

  container.innerHTML = "";

  data.forEach((lesson) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "8px 0";
    row.style.borderBottom = "1px solid #eee";
    row.innerHTML = `
      <span>📖 ${lesson.title} <span style="color:#999; font-size:0.85rem;">(${lesson.sections ? lesson.sections.name : "?"})</span></span>
      <span>
        <button onclick="editLesson('${lesson.id}')">✏️ Redaktə et</button>
        <button onclick="deleteLesson('${lesson.id}')">🗑️ Sil</button>
      </span>
    `;
    container.appendChild(row);
  });
}

async function renameLesson(lessonId, currentTitle) {
  const newTitle = window.prompt("Yeni mövzu adı:", currentTitle);
  if (!newTitle || newTitle.trim() === "") return;

  const { error } = await supabaseClient
    .from("lessons")
    .update({ title: newTitle.trim() })
    .eq("id", lessonId);

  if (error) {
    alert("Xəta baş verdi: " + error.message);
    console.error(error);
    return;
  }

  await loadLessonsList();
  await loadLessonsDropdown();
}

async function deleteLesson(lessonId) {
  const confirmDelete = window.confirm(
    "Bu mövzunu silmək istədiyinə əminsən? Bu mövzuya aid bütün suallar və şagird nəticələri də silinəcək. Bu əməliyyat geri qaytarılmır!"
  );
  if (!confirmDelete) return;

  const { error } = await supabaseClient
    .from("lessons")
    .delete()
    .eq("id", lessonId);

  if (error) {
    alert("Xəta baş verdi: " + error.message);
    console.error(error);
    return;
  }

  await loadLessonsList();
  await loadLessonsDropdown();
  document.getElementById("questionsListContainer").innerHTML = "<p>Mövzu seç.</p>";
}

// Səhifə açılanda bölmələri yüklə
loadSectionsDropdown();
loadSectionsList();

// ---------- Sual tipini dəyişəndə formanı uyğunlaşdırmaq ----------
function toggleQuestionType() {
  const type = document.getElementById("questionType").value;
  document.getElementById("choiceFields").style.display = (type === "choice") ? "block" : "none";
  document.getElementById("writtenFields").style.display = (type === "written") ? "block" : "none";
}

// ---------- Mövzuları test sualı dropdown-ına yükləmək ----------
async function loadLessonsDropdown() {
  const select = document.getElementById("questionLesson");
  select.innerHTML = "<option value=''>Yüklənir...</option>";

  const { data, error } = await supabaseClient
    .from("lessons")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    select.innerHTML = "<option value=''>Xəta baş verdi</option>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    select.innerHTML = "<option value=''>Əvvəlcə mövzu yarat</option>";
    return;
  }

  select.innerHTML = "";
  data.forEach((lesson) => {
    const option = document.createElement("option");
    option.value = lesson.id;
    option.textContent = lesson.title;
    select.appendChild(option);
  });

  select.onchange = function () {
    loadQuestionsListForLesson(select.value);
  };
}

// ---------- Redaktə rejimi üçün dəyişən ----------
let editingQuestionId = null;

// ---------- Test sualı yaratmaq / yeniləmək ----------
async function addQuestion() {
  const lessonId = document.getElementById("questionLesson").value;
  const type = document.getElementById("questionType").value;
  const questionText = document.getElementById("questionText").value.trim();
  const imageFile = document.getElementById("questionImage").files[0];
  const explainText = document.getElementById("explainText").value.trim();
  const explainVideo = document.getElementById("explainVideo").value.trim();
  const messageEl = document.getElementById("questionMessage");

  messageEl.textContent = "";

  if (!lessonId) {
    messageEl.textContent = "Mövzu seç.";
    return;
  }

  let payload = {
    lesson_id: lessonId,
    question_type: type,
    question_text: questionText || "",
    explanation_text: explainText || null,
    explanation_video_url: explainVideo || null
  };

  if (type === "choice") {
    const a = document.getElementById("answerA").value.trim();
    const b = document.getElementById("answerB").value.trim();
    const c = document.getElementById("answerC").value.trim();
    const d = document.getElementById("answerD").value.trim();
    const e = document.getElementById("answerE").value.trim();
    const correct = document.getElementById("correctOption").value;

    const options = { A: a, B: b, C: c, D: d, E: e };
    const filledCount = Object.values(options).filter(v => v).length;

    if (filledCount < 2) {
      messageEl.textContent = "Ən azı 2 variant doldur.";
      return;
    }

    if (!options[correct]) {
      messageEl.textContent = "Düzgün cavab kimi seçdiyin variant boşdur, məzmun yaz.";
      return;
    }

    payload.option_a = a;
    payload.option_b = b;
    payload.option_c = c;
    payload.option_d = d;
    payload.option_e = e;
    payload.correct_option = correct;
  } else {
    const correctWritten = document.getElementById("correctWritten").value.trim();
    if (!correctWritten) {
      messageEl.textContent = "Düzgün (yazılı) cavabı yaz.";
      return;
    }
    payload.correct_option = correctWritten;
  }

  messageEl.textContent = "Yüklənir, gözlə...";

  // Əgər yeni şəkil seçilibsə, Storage-a yüklə
  if (imageFile) {
    const fileName = `img_${Date.now()}_${imageFile.name}`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from("upload")
      .upload(fileName, imageFile);

    if (uploadError) {
      messageEl.textContent = "Şəkil yüklənərkən xəta: " + uploadError.message;
      console.error(uploadError);
      return;
    }

    const { data: urlData } = supabaseClient
      .storage
      .from("upload")
      .getPublicUrl(fileName);

    payload.image_url = urlData.publicUrl;
  }

  let error;

  if (editingQuestionId) {
    // Yeniləmə rejimi
    ({ error } = await supabaseClient
      .from("questions")
      .update(payload)
      .eq("id", editingQuestionId));
  } else {
    // Yeni sual yaratma rejimi
    ({ error } = await supabaseClient.from("questions").insert(payload));
  }

  if (error) {
    messageEl.textContent = "Xəta baş verdi: " + error.message;
    console.error(error);
    return;
  }

  messageEl.textContent = editingQuestionId ? "✅ Sual uğurla yeniləndi." : "✅ Sual uğurla əlavə olundu.";

  cancelEditQuestion();
  loadQuestionsListForLesson(lessonId);
}

// ---------- Redaktə rejimini ləğv edib formu təmizləmək ----------
function cancelEditQuestion() {
  editingQuestionId = null;
  document.getElementById("questionSubmitBtn").textContent = "📝 Sual əlavə et";
  document.getElementById("cancelEditBtn").style.display = "none";

  document.getElementById("questionText").value = "";
  document.getElementById("questionImage").value = "";
  document.getElementById("answerA").value = "";
  document.getElementById("answerB").value = "";
  document.getElementById("answerC").value = "";
  document.getElementById("answerD").value = "";
  document.getElementById("answerE").value = "";
  document.getElementById("correctWritten").value = "";
  document.getElementById("explainText").value = "";
  document.getElementById("explainVideo").value = "";
  document.getElementById("questionType").value = "choice";
  toggleQuestionType();
}

// ---------- Sualı redaktə üçün formaya yükləmək ----------
async function editQuestion(questionId) {
  const { data: q, error } = await supabaseClient
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .maybeSingle();

  if (error || !q) {
    alert("Sual tapılmadı.");
    console.error(error);
    return;
  }

  editingQuestionId = q.id;

  document.getElementById("questionLesson").value = q.lesson_id;
  document.getElementById("questionType").value = q.question_type;
  toggleQuestionType();
  document.getElementById("questionText").value = q.question_text || "";
  document.getElementById("explainText").value = q.explanation_text || "";
  document.getElementById("explainVideo").value = q.explanation_video_url || "";

  if (q.question_type === "choice") {
    document.getElementById("answerA").value = q.option_a || "";
    document.getElementById("answerB").value = q.option_b || "";
    document.getElementById("answerC").value = q.option_c || "";
    document.getElementById("answerD").value = q.option_d || "";
    document.getElementById("answerE").value = q.option_e || "";
    document.getElementById("correctOption").value = q.correct_option || "A";
  } else {
    document.getElementById("correctWritten").value = q.correct_option || "";
  }

  document.getElementById("questionSubmitBtn").textContent = "💾 Sualı yenilə";
  document.getElementById("cancelEditBtn").style.display = "inline-block";

  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

// ---------- Mövcud sualların siyahısı (seçilmiş mövzu üzrə) ----------
async function loadQuestionsListForLesson(lessonId) {
  const container = document.getElementById("questionsListContainer");

  if (!lessonId) {
    container.innerHTML = "<p>Mövzu seç.</p>";
    return;
  }

  container.innerHTML = "<p>Yüklənir...</p>";

  const { data, error } = await supabaseClient
    .from("questions")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  if (error) {
    container.innerHTML = "<p>Xəta baş verdi.</p>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Bu mövzuda hələ sual yoxdur.</p>";
    return;
  }

  container.innerHTML = "";

  data.forEach((q, index) => {
    const label = q.question_text ? q.question_text : (q.image_url ? "(şəkilli sual)" : "(boş sual)");
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "8px 0";
    row.style.borderBottom = "1px solid #eee";
    row.innerHTML = `
      <span>${index + 1}. ${label} <span style="color:#999; font-size:0.85rem;">(${q.question_type === "choice" ? "variantlı" : "yazılı"})</span></span>
      <span>
        <button onclick="editQuestion('${q.id}')">✏️ Redaktə et</button>
        <button onclick="deleteQuestion('${q.id}', '${lessonId}')">🗑️ Sil</button>
      </span>
    `;
    container.appendChild(row);
  });
}

async function deleteQuestion(questionId, lessonId) {
  const confirmDelete = window.confirm("Bu sualı silmək istədiyinə əminsən? Bu sualla bağlı şagird cavabları da silinəcək.");
  if (!confirmDelete) return;

  const { error } = await supabaseClient
    .from("questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    alert("Xəta baş verdi: " + error.message);
    console.error(error);
    return;
  }

  loadQuestionsListForLesson(lessonId);
}

// Səhifə açılanda mövzuları da yüklə
loadLessonsDropdown().then(() => {
  const select = document.getElementById("questionLesson");
  if (select.value) {
    loadQuestionsListForLesson(select.value);
  }
});
loadLessonsList();