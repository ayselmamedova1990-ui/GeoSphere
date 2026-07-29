// ============================================
// GeoSphere - Nəticə Səhifəsi (result.js)
// ============================================

if (sessionStorage.getItem("role") !== "student") {
  window.location.href = "index.html";
}

const rawResults = sessionStorage.getItem("lastTestResults");
const results = rawResults ? JSON.parse(rawResults) : [];

function renderResults() {
  const scoreBox = document.getElementById("scoreBox");
  const container = document.getElementById("detailsContainer");

  if (!results || results.length === 0) {
    scoreBox.innerHTML = "<p>Nəticə tapılmadı.</p>";
    return;
  }

  const correctCount = results.filter(r => r.is_correct).length;
  const total = results.length;
  const percent = Math.round((correctCount / total) * 100);

  const attemptNumber = sessionStorage.getItem("lastAttemptNumber");

  scoreBox.innerHTML = `
    <h2 style="color:#1565c0;">${attemptNumber ? attemptNumber + "-ci cəhd: " : ""}${correctCount} / ${total} düzgün</h2>
    <p style="color:#666;">Nəticə: %${percent}</p>
  `;

  container.innerHTML = "";

  results.forEach((r, index) => {
    const block = document.createElement("div");
    block.style.background = "white";
    block.style.borderRadius = "12px";
    block.style.padding = "18px";
    block.style.marginBottom = "16px";
    block.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)";
    block.style.borderLeft = r.is_correct ? "5px solid #1565c0" : "5px solid #c0392b";

    let html = `<h3>${index + 1}. ${r.question_text || ""}</h3>`;
    html += `<p><strong>Sənin cavabın:</strong> ${r.student_answer || "(boş)"} ${r.is_correct ? "✅" : "❌"}</p>`;

    if (!r.is_correct) {
      if (r.question_type === "choice") {
        const options = { A: r.option_a, B: r.option_b, C: r.option_c, D: r.option_d, E: r.option_e };
        html += `<p><strong>Düzgün cavab:</strong> ${r.correct_option}) ${options[r.correct_option] || ""}</p>`;
      } else {
        html += `<p><strong>Düzgün cavab:</strong> ${r.correct_option}</p>`;
      }

      if (r.explanation_text) {
        html += `<p><strong>💡 İzah:</strong> ${r.explanation_text}</p>`;
      }

      if (r.explanation_video_url) {
        html += `
          <div style="margin-top:10px;">
            <iframe width="100%" height="315" src="${r.explanation_video_url}" frameborder="0" allowfullscreen></iframe>
          </div>
        `;
      }
    }

    block.innerHTML = html;
    container.appendChild(block);
  });
}

renderResults();