// ============================================
// GeoSphere - Test Səhifəsi (test.js)
// ============================================

if (sessionStorage.getItem("role") !== "student") {
  window.location.href = "index.html";
}

const params = new URLSearchParams(window.location.search);
const lessonId = params.get("lessonId");
const studentId = sessionStorage.getItem("studentId");

let questions = [];

async function loadTest() {
  const { data: lesson } = await supabaseClient
    .from("lessons")
    .select("title")
    .eq("id", lessonId)
    .maybeSingle();

  if (lesson) {
    document.getElementById("testTitle").textContent = "📝 Test: " + lesson.title;
  }

  const { data, error } = await supabaseClient
    .from("questions")
    .select("*")
    .eq("lesson_id", lessonId);

  if (error || !data || data.length === 0) {
    document.getElementById("quiz").innerHTML = "<p>Bu mövzu üçün hələ test yoxdur.</p>";
    return;
  }

  questions = data;
  renderQuestions();
}

function renderQuestions() {
  const container = document.getElementById("quiz");
  container.innerHTML = "";

  questions.forEach((q, index) => {
    const block = document.createElement("div");
    block.style.background = "white";
    block.style.borderRadius = "12px";
    block.style.padding = "18px";
    block.style.marginBottom = "16px";
    block.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)";

    let html = `<h3>${index + 1}. ${q.question_text || ""}</h3>`;

    if (q.image_url) {
      html += `<img src="${q.image_url}" style="max-width:100%; border-radius:8px; margin:10px 0;">`;
    }

    if (q.question_type === "choice") {
      const options = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d, E: q.option_e };
      html += `<div>`;
      for (const letter in options) {
        if (options[letter]) {
          html += `
            <label style="display:block; margin:8px 0; cursor:pointer;">
              <input type="radio" name="q_${q.id}" value="${letter}">
              ${letter}) ${options[letter]}
            </label>
          `;
        }
      }
      html += `</div>`;
    } else {
      html += `<input type="text" id="written_${q.id}" placeholder="Cavabını yaz" style="width:100%; padding:9px 10px; border:1px solid #ddd; border-radius:6px;">`;
    }

    block.innerHTML = html;
    container.appendChild(block);
  });
}

async function submitTest() {
  const results = [];

  for (const q of questions) {
    let studentAnswer = "";
    let isCorrect = false;

    if (q.question_type === "choice") {
      const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
      studentAnswer = selected ? selected.value : "";
      isCorrect = studentAnswer && studentAnswer === q.correct_option;
    } else {
      const input = document.getElementById(`written_${q.id}`);
      studentAnswer = input ? input.value.trim() : "";
      isCorrect = studentAnswer.toLowerCase() === (q.correct_option || "").trim().toLowerCase();
    }

    results.push({
      question_id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      student_answer: studentAnswer,
      correct_option: q.correct_option,
      is_correct: isCorrect,
      explanation_text: q.explanation_text,
      explanation_video_url: q.explanation_video_url,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e
    });
  }

  const correctCount = results.filter(r => r.is_correct).length;

  // Neçənci cəhd olduğunu tap
  const { count: previousAttempts } = await supabaseClient
    .from("test_attempts")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId);

  const attemptNumber = (previousAttempts || 0) + 1;

  // Cəhd sətrini yarat
  const { data: attempt, error: attemptError } = await supabaseClient
    .from("test_attempts")
    .insert({
      student_id: studentId,
      lesson_id: lessonId,
      attempt_number: attemptNumber,
      correct_count: correctCount,
      total_questions: results.length
    })
    .select()
    .maybeSingle();

  if (attemptError) {
    console.error(attemptError);
  }

  // Bazaya hər sualın nəticəsini yaz (cəhdə bağlı)
  const rowsToInsert = results.map(r => ({
    student_id: studentId,
    question_id: r.question_id,
    student_answer: r.student_answer,
    is_correct: r.is_correct,
    attempt_id: attempt ? attempt.id : null
  }));

  const { error } = await supabaseClient.from("test_results").insert(rowsToInsert);

  if (error) {
    console.error(error);
  }

  // Nəticə səhifəsi üçün müvəqqəti saxla
  sessionStorage.setItem("lastTestResults", JSON.stringify(results));
  sessionStorage.setItem("lastTestLessonId", lessonId);
  sessionStorage.setItem("lastAttemptNumber", attemptNumber);

  window.location.href = "result.html";
}

loadTest();