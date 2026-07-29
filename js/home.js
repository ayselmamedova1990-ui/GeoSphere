// ============================================
// GeoSphere - Ana Səhifə (home.js)
// ============================================

// Bu səhifəyə yalnız şagird daxil ola bilər
if (sessionStorage.getItem("role") !== "student") {
  window.location.href = "index.html";
}

document.getElementById("welcomeText").textContent =
  "🌍 Xoş gəlmisiniz, " + sessionStorage.getItem("studentName");

async function loadSections() {
  const container = document.getElementById("sectionsContainer");

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
    container.innerHTML = "<p>Hələ bölmə əlavə edilməyib.</p>";
    return;
  }

  container.innerHTML = "";

  data.forEach((section) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>📁 ${section.name}</h3>
      <p>Bu bölməyə aid mövzulara bax.</p>
      <a href="lessons.html?sectionId=${section.id}&sectionName=${encodeURIComponent(section.name)}">
        <button>Başla</button>
      </a>
    `;
    container.appendChild(card);
  });
}

loadSections();