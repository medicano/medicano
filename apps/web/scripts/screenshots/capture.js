const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://medicano.app';
const SCREENSHOTS_DIR = path.join(__dirname);
const VIEWPORT = { width: 1440, height: 900 };

const CREDENTIALS = {
  patient: { email: 'paciente@teste.com', password: 'Teste@123' },
  clinic:  { email: 'clinica@teste.com',  password: 'Teste@123' },
};

// IDs resolvidos em tempo de execução
let clinicId = null;
let patientSessionId = null;
let patientAppointmentId = null;
let professionalId = null;

async function screenshot(page, filename) {
  const dest = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: dest, fullPage: true });
  console.log(`  ✓  ${filename}`);
}

// ---------------------------------------------------------------------------
// Login helpers
// ---------------------------------------------------------------------------

async function loginAs(page, role) {
  const { email, password } = CREDENTIALS[role];
  console.log(`\n→ Login como ${role} (${email})`);

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  const passField  = page.locator('input[type="password"]').first();

  await emailField.fill(email);
  await passField.fill(password);

  await page.locator('button[type="submit"]').first().click();

  // Para SPAs com client-side routing, waitForURL é mais confiável que waitForNavigation
  try {
    await page.waitForURL(url => !url.includes('/login'), { timeout: 20_000 });
  } catch {
    const errorEl = page.locator('[class*="text-red"], [class*="error"]').first();
    const errorText = await errorEl.textContent({ timeout: 2_000 }).catch(() => '');
    if (errorText) console.warn(`  ⚠ Erro de login: ${errorText}`);
  }

  console.log(`  URL após login: ${page.url()}`);
}

// ---------------------------------------------------------------------------
// Discover IDs from the logged-in state
// ---------------------------------------------------------------------------

async function discoverPatientIds(page) {
  // Clinic ID — busca a primeira clínica disponível
  try {
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
    const clinicLink = await page.locator('a[href*="/clinic/"]').first().getAttribute('href', { timeout: 10_000 });
    if (clinicLink) {
      clinicId = clinicLink.split('/clinic/')[1].split('/')[0].split('?')[0];
      console.log(`  clinicId descoberto: ${clinicId}`);
    }
  } catch (e) {
    console.warn(`  ⚠ Não conseguiu descobrir clinicId: ${e.message}`);
  }

  // Session ID — lista de sessões do assistente
  try {
    await page.goto(`${BASE_URL}/assistant`, { waitUntil: 'networkidle' });
    const sessionLink = await page.locator('a[href*="/assistant/"]').first().getAttribute('href', { timeout: 10_000 });
    if (sessionLink) {
      patientSessionId = sessionLink.split('/assistant/')[1].split('/')[0].split('?')[0];
      console.log(`  sessionId descoberto: ${patientSessionId}`);
    }
  } catch (e) {
    console.warn(`  ⚠ Não conseguiu descobrir sessionId: ${e.message}`);
  }

  // Appointment ID
  try {
    await page.goto(`${BASE_URL}/appointments`, { waitUntil: 'networkidle' });
    const apptLink = await page.locator('a[href*="/appointments/"]').first().getAttribute('href', { timeout: 10_000 });
    if (apptLink) {
      patientAppointmentId = apptLink.split('/appointments/')[1].split('/')[0].split('?')[0];
      console.log(`  appointmentId descoberto: ${patientAppointmentId}`);
    }
  } catch (e) {
    console.warn(`  ⚠ Não conseguiu descobrir appointmentId: ${e.message}`);
  }

  // Professional ID
  try {
    if (clinicId) {
      await page.goto(`${BASE_URL}/clinic/${clinicId}`, { waitUntil: 'networkidle' });
      const profLink = await page.locator('a[href*="/book/"]').first().getAttribute('href', { timeout: 10_000 });
      if (profLink) {
        professionalId = profLink.split('/book/')[1].split('/')[0].split('?')[0];
        console.log(`  professionalId descoberto: ${professionalId}`);
      }
    }
  } catch (e) {
    console.warn(`  ⚠ Não conseguiu descobrir professionalId: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// Public screens (no auth)
// ---------------------------------------------------------------------------

async function capturePublicScreens(browser) {
  console.log('\n=== Telas Públicas ===');
  const ctx  = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  const screens = [
    { url: '/',         file: '01-landing.png' },
    { url: '/login',    file: '02-login.png' },
    { url: '/register', file: '03-cadastro.png' },
    { url: '/search',   file: '05-busca-publica.png' },
  ];

  for (const { url, file } of screens) {
    try {
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle', timeout: 30_000 });
      await screenshot(page, file);
    } catch (e) {
      console.warn(`  ⚠ Erro em ${url}: ${e.message}`);
    }
  }

  await ctx.close();
}

// ---------------------------------------------------------------------------
// Patient screens
// ---------------------------------------------------------------------------

async function capturePatientScreens(browser) {
  console.log('\n=== Telas do Paciente ===');
  const ctx  = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  await loginAs(page, 'patient');

  // Descobre IDs antes de capturar as telas que precisam deles
  await discoverPatientIds(page);

  const screens = [
    { url: '/home',          file: '04-paciente-home.png' },
    { url: '/search',        file: '05-paciente-busca.png' },
    { url: '/assistant',     file: '07-paciente-assistente-lista.png' },
    { url: '/appointments',  file: '09-paciente-agendamentos.png' },
    { url: '/notifications', file: '11-paciente-notificacoes.png' },
    { url: '/settings',      file: '12-paciente-configuracoes.png' },
    { url: '/book/success',  file: '14-paciente-agendar-sucesso.png' },
  ];

  // Telas que dependem de IDs
  if (clinicId) {
    screens.push({ url: `/clinic/${clinicId}`, file: '06-paciente-clinica-perfil.png' });
  } else {
    console.warn('  ⚠ Pulando /clinic/:clinicId — ID não disponível');
  }

  if (patientSessionId) {
    screens.push({ url: `/assistant/${patientSessionId}`, file: '08-paciente-assistente-chat.png' });
  } else {
    console.warn('  ⚠ Pulando /assistant/:sessionId — ID não disponível');
  }

  if (patientAppointmentId) {
    screens.push({ url: `/appointments/${patientAppointmentId}`, file: '10-paciente-agendamento-detalhe.png' });
  } else {
    console.warn('  ⚠ Pulando /appointments/:id — ID não disponível');
  }

  if (professionalId) {
    screens.push({ url: `/book/${professionalId}`, file: '13-paciente-agendar.png' });
  } else {
    console.warn('  ⚠ Pulando /book/:professionalId — ID não disponível');
  }

  for (const { url, file } of screens) {
    try {
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle', timeout: 30_000 });
      await screenshot(page, file);
    } catch (e) {
      console.warn(`  ⚠ Erro em ${url}: ${e.message}`);
    }
  }

  await ctx.close();
}

// ---------------------------------------------------------------------------
// Staff / Clinic screens
// ---------------------------------------------------------------------------

async function captureStaffScreens(browser) {
  console.log('\n=== Telas de Staff (Clínica) ===');
  const ctx  = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  await loginAs(page, 'clinic');

  const screens = [
    { url: '/dashboard',     file: '15-staff-dashboard.png' },
    { url: '/professionals', file: '16-staff-profissionais.png' },
    { url: '/attendants',    file: '17-staff-atendentes.png' },
    { url: '/subscription',  file: '18-staff-assinatura.png' },
    { url: '/appointments',  file: '19-staff-agendamentos.png' },
    { url: '/settings',      file: '20-staff-configuracoes.png' },
  ];

  for (const { url, file } of screens) {
    try {
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle', timeout: 30_000 });
      await screenshot(page, file);
    } catch (e) {
      console.warn(`  ⚠ Erro em ${url}: ${e.message}`);
    }
  }

  await ctx.close();
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  console.log(`Salvando screenshots em: ${SCREENSHOTS_DIR}`);
  console.log(`Alvo: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    await capturePublicScreens(browser);
    await capturePatientScreens(browser);
    await captureStaffScreens(browser);
  } finally {
    await browser.close();
  }

  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
  console.log(`\nConcluído! ${files.length} screenshot(s) salvo(s) em ${SCREENSHOTS_DIR}`);
}

main().catch(err => {
  console.error('\nErro fatal:', err);
  process.exit(1);
});
