// ============================================
// GeoSphere - Giriş (Login) Sistemi
// ============================================

async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const messageEl = document.getElementById("loginMessage");

  messageEl.textContent = "";

  if (!username || !password) {
    messageEl.textContent = "İstifadəçi adı və şifrəni daxil et.";
    return;
  }

  // 1. Müəllim girişi - təhlükəsiz RPC funksiyası ilə yoxlanır
  const { data: teacherData } = await supabaseClient
    .rpc("check_teacher_login", { p_username: username, p_password: password })
    .maybeSingle();

  if (teacherData) {
    sessionStorage.setItem("role", "teacher");
    sessionStorage.setItem("teacherName", teacherData.full_name);
    window.location.href = "teacher.html";
    return;
  }

  // 2. Şagird girişi - təhlükəsiz RPC funksiyası ilə yoxlanır
  const { data, error } = await supabaseClient
    .rpc("check_student_login", { p_username: username, p_password: password })
    .maybeSingle();

  if (error) {
    messageEl.textContent = "Xəta baş verdi, bir az sonra yenidən cəhd et.";
    console.error(error);
    return;
  }

  if (!data) {
    messageEl.textContent = "İstifadəçi adı və ya şifrə səhvdir.";
    return;
  }

  if (!data.is_active) {
    messageEl.textContent = "Bu hesaba giriş müəllim tərəfindən bağlanıb.";
    return;
  }

  if (!data.is_approved) {
    messageEl.textContent = "Hesabınız hələ müəllim tərəfindən təsdiqlənməyib.";
    return;
  }

  // Uğurlu giriş - şagird məlumatını sessiyada saxlayırıq
  sessionStorage.setItem("role", "student");
  sessionStorage.setItem("studentId", data.id);
  sessionStorage.setItem("studentName", data.full_name);

  window.location.href = "home.html";
}