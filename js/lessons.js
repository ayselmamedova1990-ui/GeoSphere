// ============================================
// GeoSphere - Mövzular Siyahısı (lessons.js)
// ============================================

if (sessionStorage.getItem("role") !== "student") {
  window.location.href = "index.html";
}

const params = new URLSearchParams(window.location.search);
const sectionId = params.get("sectionId");
const sectionName = params.get("sectionName");

document.getElementById("sectionTitle").textContent = "📁 " + (sectionName || "Mövzular");

async function loadLessons() {
  const container = document.getElementById("lessonsContainer");

  if (!sectionId) {
    container.innerHTML = "<p>Bölmə tapılmadı.</p>";
    return;
  }

  const { data, error } = await supabaseClient
    .from("lessons")
    .select("*")
    .eq("section_id", sectionId)
    .order("created_at", { ascending: true });

  if (error) {
    container.innerHTML = "<p>Xəta baş verdi.</p>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Bu bölmədə hələ mövzu yoxdur.</p>";
    return;
  }

  container.innerHTML = "";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "12px";

  data.forEach((lesson, index) => {
    const row = document.createElement("div");
    row.className = "card";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:14px;">
        <span style="background:#1565c0; color:white; font-weight:700; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${index + 1}</span>
        <h3 style="margin:0;">📖 ${lesson.title}</h3>
      </div>
      <a href="lesson.html?lessonId=${lesson.id}">
        <button>Dərsə keç</button>
      </a>
    `;
    container.appendChild(row);
  });
}

loadLessons();