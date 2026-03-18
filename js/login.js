import { supabase } from './supabase-config.js';

// Seletores do DOM
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');

// Novos seletores de registo
const registerFieldsWrapper = document.getElementById('register-fields-wrapper');
const nomeInput = document.getElementById('nome');
const cargoInput = document.getElementById('cargo');

const btnLogin = document.getElementById('btn-login');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');

const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');
const authMessage = document.getElementById('auth-message');
const confirmPasswordWrapper = document.getElementById('confirm-password-wrapper');
const rememberWrapper = document.getElementById('remember-wrapper');
const forgotPasswordLink = document.getElementById('forgot-password-link');

let isRegisterMode = false;

// ----------------------------------------------------
// Funções Auxiliares de Geolocalização
// ----------------------------------------------------
function obterLocalizacao() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("A geolocalização não é suportada pelo seu navegador."));
    } else {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false, // <-- Mude para false para testar no PC
        timeout: 15000,            // <-- Aumente para 15 segundos
        maximumAge: 0
      });
    }
  });
}

// Fórmula de Haversine para calcular a distância (em KM)
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

// ----------------------------------------------------
// Controlo de Interface
// ----------------------------------------------------
function showMessage(message, type = 'error') {
  authMessage.textContent = message;
  authMessage.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'border', 'border-red-200', 'bg-green-50', 'text-green-700', 'border-green-200');

  if (type === 'success') {
    authMessage.classList.add('bg-green-50', 'text-green-700', 'border', 'border-green-200');
  } else {
    authMessage.classList.add('bg-red-50', 'text-red-700', 'border', 'border-red-200');
  }
}

function clearMessage() {
  authMessage.textContent = '';
  authMessage.classList.add('hidden');
}

function updateMode() {
  clearMessage();

  if (isRegisterMode) {
    formTitle.textContent = 'Criar registo';
    formSubtitle.textContent = 'Preencha os seus dados para criar um novo acesso no sistema.';
    btnLogin.textContent = 'Criar Conta';
    toggleAuthModeBtn.textContent = 'Já tem conta? Entrar';
    
    // Mostra campos de registo
    registerFieldsWrapper.classList.remove('hidden');
    confirmPasswordWrapper.classList.remove('hidden');
    forgotPasswordLink.classList.add('hidden');
    rememberWrapper.classList.add('hidden');
    
    // Exige os campos extra
    confirmPasswordInput.required = true;
    nomeInput.required = true;
    cargoInput.required = true;
  } else {
    formTitle.textContent = 'Acessar sistema';
    formSubtitle.textContent = 'Entre com as suas credenciais para aceder ao painel administrativo.';
    btnLogin.textContent = 'Entrar no Sistema';
    toggleAuthModeBtn.textContent = 'Não tem conta? Criar registo';
    
    // Oculta campos de registo
    registerFieldsWrapper.classList.add('hidden');
    confirmPasswordWrapper.classList.add('hidden');
    forgotPasswordLink.classList.remove('hidden');
    rememberWrapper.classList.remove('hidden');
    
    // Repõe validações extra
    confirmPasswordInput.required = false;
    nomeInput.required = false;
    cargoInput.required = false;
    confirmPasswordInput.value = '';
    nomeInput.value = '';
    cargoInput.value = '';
  }
}

function setLoading(isLoading, label = 'A processar...') {
  btnLogin.disabled = isLoading;
  btnLogin.textContent = isLoading ? label : (isRegisterMode ? 'Criar Conta' : 'Entrar no Sistema');
}

// ----------------------------------------------------
// Eventos
// ----------------------------------------------------
toggleAuthModeBtn.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  updateMode();
});

forgotPasswordLink.addEventListener('click', async (e) => {
  e.preventDefault();
  clearMessage();
  const email = emailInput.value.trim();

  if (!email) {
    showMessage('Digite o seu e-mail para receber a ligação de redefinição de palavra-passe.');
    return;
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });

    if (error) {
      showMessage('Erro ao solicitar redefinição: ' + error.message);
      return;
    }

    showMessage('Ligação de redefinição enviada para o seu e-mail.', 'success');
  } catch (err) {
    showMessage('Erro inesperado ao solicitar redefinição de palavra-passe.');
    console.error(err);
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const nome = nomeInput.value.trim();
  const cargo = cargoInput.value;

  if (!email || !password) {
    showMessage('Preencha o e-mail e a palavra-passe.');
    return;
  }

  // Lógica de Registo
  if (isRegisterMode) {
    if (password.length < 6) {
      showMessage('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      showMessage('As palavras-passe não coincidem.');
      return;
    }

    setLoading(true, 'A verificar localização...');

    try {
      const position = await obterLocalizacao();
      const latUsuario = position.coords.latitude;
      const lonUsuario = position.coords.longitude;

// Coordenadas aproximadas do Plus Code W4F3+RC (São José, Recife - PE)
      const latAlvo = -8.0691;
      const lonAlvo = -34.8783;

      const distancia = calcularDistancia(latUsuario, lonUsuario, latAlvo, lonAlvo);

      // Pode apagar ou manter estes console.log, são úteis se a internet mudar de IP
      console.log(`Sua Latitude: ${latUsuario}, Sua Longitude: ${lonUsuario}`);
      console.log(`Distância calculada da sede: ${distancia.toFixed(2)} km`);

      // Limite ajustado para 3.0 km para acomodar o IP da rede da gravadora
      if (distancia > 3.0) {
        showMessage(`Acesso negado: O sistema detetou que está a ${distancia.toFixed(1)} km da sede. O registo só é permitido na rede da empresa.`);
        setLoading(false);
        return;
      }
} catch (err) {
      // MODO DEBUG: Vai mostrar o erro exato no console (F12)
      console.warn("Erro detalhado de Geolocalização:", err);
      
      if (err.code === 1) {
        showMessage('Acesso negado: Você bloqueou a permissão de localização no navegador.');
      } else if (err.code === 2) {
        showMessage('Erro técnico: O navegador não conseguiu determinar sua posição atual (Position Unavailable). Verifique se o Windows/Mac está com a localização ativada.');
      } else if (err.code === 3) {
        showMessage('Erro técnico: Tempo esgotado ao tentar obter a localização (Timeout).');
      } else {
        showMessage('Erro desconhecido ao tentar acessar a localização.');
      }
      
      setLoading(false);
      return;
    }

    setLoading(true, 'A criar conta...');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: nome,
            cargo: cargo,
            status: 'ativo'
          }
        }
      });

      if (error) {
        showMessage('Erro ao criar conta: ' + error.message);
        return;
      }

      if (data?.user) {
        showMessage('Registo efetuado! O utilizador já pode gerir lançamentos internamente.', 'success');
        loginForm.reset();
        isRegisterMode = false;
        updateMode();
      } else {
        showMessage('Conta criada, mas não foi possível confirmar o retorno do utilizador.', 'success');
      }
    } catch (err) {
      console.error(err);
      showMessage('Erro inesperado ao criar conta.');
    } finally {
      setLoading(false);
    }
    return;
  }

  // Lógica de Início de Sessão Padrão
  setLoading(true, 'A verificar...');

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showMessage('Erro no início de sessão: ' + error.message);
      return;
    }

    window.location.href = 'dashboard.html';
  } catch (err) {
    console.error(err);
    showMessage('Erro inesperado ao iniciar sessão.');
  } finally {
    setLoading(false);
  }
});

// Inicializa a interface
updateMode();