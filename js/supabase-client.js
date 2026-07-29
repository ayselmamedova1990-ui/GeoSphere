// ============================================
// GeoSphere - Supabase Bağlantısı
// ============================================
// Aşağıdakı iki dəyəri öz Supabase layihəndən
// kopyalayıb bura yapışdır:
// Supabase Dashboard -> Settings -> API

const SUPABASE_URL = "https://oijbjoyezkzsefxparfr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AzsOuqpA-o3RqfM9xEPwRA_fxoONCcS";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);