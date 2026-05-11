import { supabase } from './supabase-client.js';

(async function() {
  const { data: { session } } = await supabase.auth.getSession();
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.includes('login.html');

  // 1. Se não está logado e não está na página de login → redireciona para login
  if (!session && !isLoginPage) {
    sessionStorage.setItem('redirect_after_login', currentPath);
    window.location.href = 'login.html';
    return;
  }

  // 2. Se está logado
  if (session) {
    const now = new Date();
    const isMonday = now.getDay() === 1; // 0 = domingo, 1 = segunda
    const lastLoginStr = localStorage.getItem('somax_last_login_date');
    const lastLogin = lastLoginStr ? new Date(lastLoginStr) : null;
    const loggedToday = lastLogin && lastLogin.toDateString() === now.toDateString();

    // Regra de segurança: toda segunda-feira precisa de novo login
    if (isMonday && !loggedToday) {
      await supabase.auth.signOut();
      localStorage.removeItem('somax_last_login_date');
      if (!isLoginPage) window.location.href = 'login.html';
      return;
    }

    // Se está logado e tentar acessar login.html → vai para index
    if (isLoginPage) {
      window.location.href = 'index.html';
    }
  }
})();