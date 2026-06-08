# Plano de Testes Manuais — Medicano

> Bateria de testes manuais (positivos e negativos) do que está implementado hoje.
> Cobre os 4 papéis (`patient`, `clinic`, `professional`, `attendant`), o fluxo
> de cadastro/login, busca, agendamento, disponibilidade, assinaturas, atendentes,
> perfil do paciente (LGPD) e o assistente de IA.
>
> Data: 2026-06-07 · Branch: `main`

---

## 0. Pré-requisitos e como subir o ambiente

| Item | Comando / Observação |
|---|---|
| Infra local | `sudo docker compose up -d` (MongoDB 27017, Redis 6379) |
| API | `cd apps/api && npm run start:dev` → sobe em `http://localhost:3000` (sem prefixo global, CORS habilitado) |
| Web | `cd apps/web && npm run dev` → Vite; consome `VITE_API_URL` ou `http://localhost:3000` |
| AWS | A API em `development` busca o secret `medicano/api/development`. Garanta `aws configure`/SSO ativo, senão a API não sobe. |

**Antes de começar:** tenha um banco limpo ou anote que dados pré-existentes podem
mascarar testes de unicidade (e-mail/CNPJ duplicado). A API valida payloads com
`whitelist: true` — campos não declarados no DTO são **silenciosamente removidos**,
não rejeitados (importante ao interpretar resultados negativos).

Legenda: ✅ = resultado esperado (positivo) · ⛔ = erro esperado (negativo).

---

## 1. Cadastro (Signup) — `/register`

O signup cria o usuário **e já retorna o token (auto-login)**. `role` é definido no
cadastro e **nunca muda**. Senha mínima de **8 caracteres**.

### 1.1 Paciente — positivos
1. ✅ Cadastrar paciente com nome, e-mail válido, senha ≥8, **telefone** (10–14 dígitos, pode iniciar com `+`), data de nascimento válida → cria e loga, redireciona para `/home`.
2. ✅ Telefone com `+5511999998888` → aceito.
3. ✅ Gênero/pronomes preenchidos (opcionais) → aceitos.

### 1.2 Paciente — negativos
4. ⛔ Senha com 7 caracteres → erro de validação (mín. 8).
5. ⛔ E-mail sem `@` / malformado → erro de validação.
6. ⛔ **Sem telefone** (role patient) → "Telefone é obrigatório para pacientes".
7. ⛔ Telefone com 9 dígitos ou com letras → erro de formato (regex `^\+?\d{10,14}$`).
8. ⛔ Data de nascimento inválida (ex.: `2020-13-40`) → "Data de nascimento inválida".
9. ⛔ E-mail **já cadastrado** → "Usuário já cadastrado" (409).

### 1.3 Clínica — positivos
10. ✅ Cadastrar clínica com nome, e-mail, senha, **CNPJ de 14 dígitos** e endereço estruturado (CEP 8 dígitos, número etc.) → cria clínica, gera assinatura **FREE** automática, geocodifica o endereço (se Nominatim responder).
11. ✅ CNPJ enviado com máscara (`12.345.678/0001-99`) → o backend remove pontuação e salva só dígitos. (Verifique se o front envia 14 dígitos.)
12. ✅ Endereço que o Nominatim não encontra → cadastro conclui mesmo sem coordenadas (clínica pode reabastecer depois).

### 1.4 Clínica — negativos
13. ⛔ **CNPJ já cadastrado** → "CNPJ já cadastrado" (409).
14. ⛔ CNPJ com menos de 14 dígitos → erro de validação.
15. ⛔ CEP com ≠ 8 dígitos → "CEP deve ter 8 dígitos".
16. ⛔ Estado com ≠ 2 letras → erro de validação.

### 1.5 Profissional autônomo — positivos
17. ✅ Cadastrar profissional com nome, e-mail, senha, especialidade, registro (CRM etc.), CPF e endereço → cria profissional, geocodifica.
18. ✅ Escolher plano no cadastro (`free`/`basico`/`avancado`) → salvo no perfil; sem escolha assume `free` (default).

### 1.6 Profissional — negativos
19. ⛔ Especialidade fora do enum `Specialty` (ex.: `"qualquer"`) → 400 (agora `@IsEnum(Specialty)`). O front envia sempre o valor canônico do enum, então o cadastro normal passa.

> ⚠️ **Atenção ao montar a clínica/profissional:** o cadastro usa rollback manual
> (sem transação). Se a criação do documento de perfil falhar depois do usuário,
> o usuário é removido. Vale testar: forçar um CNPJ duplicado e confirmar que
> **não sobra usuário órfão** (tente logar com aquele e-mail depois → deve falhar).

---

## 2. Login / Logout — `/login`

Dois fluxos: **login padrão** (e-mail + senha) para patient/clinic/professional,
e **login de atendente** (clinicId + username + senha).

### 2.1 Login padrão — positivos
20. ✅ Login com e-mail+senha corretos → retorna token, redireciona conforme papel (patient→`/home`, demais→`/dashboard`).
21. ✅ Após login, recarregar a página → sessão persiste (token no storage; `GET /profile/me` valida).

### 2.2 Login padrão — negativos
22. ⛔ Senha errada → "Credenciais inválidas" (401) — mensagem genérica, não revela se o e-mail existe.
23. ⛔ E-mail inexistente → "Credenciais inválidas" (401).
24. ⛔ Senha com <8 caracteres → erro de validação antes mesmo de consultar.

### 2.3 Login de atendente — positivos
25. ✅ `clinicId` (de uma clínica) + `username` + senha do atendente → loga como `attendant`.
26. ✅ Atendente de **profissional autônomo**: confirmar como o front passa o identificador (o backend resolve por clínica **ou** por profissional via `resolveAttendant`).

### 2.4 Login de atendente — negativos
27. ⛔ `username` correto mas senha errada → "Credenciais inválidas".
28. ⛔ `clinicId` que não existe → "Credenciais inválidas".
29. ⛔ `clinicId` vazio → erro de validação (`MinLength(1)`).

### 2.5 Logout (validação dupla JWT + Redis)
30. ✅ Logout → token é revogado no Redis. Tentar reusar o **mesmo token** em qualquer rota protegida → 401 (mesmo que o JWT ainda não tenha expirado).
31. ✅ Token expira após 7 dias (604800s) — não testável manualmente sem esperar, mas confirme o TTL no Redis se possível.
32. ⛔ Chamar rota protegida **sem** header `Authorization` → 401.
33. ⛔ Header com token aleatório/inválido → 401.

---

## 3. Busca — `/search` (paciente)

Filtros: `specialty` (enum), `city`, `name`, `type` (clinic/professional/all),
`userLat`/`userLng`, `radius` (1–500 km, só aplica com lat/lng). Só clínicas
**ativas** e com assinatura válida entram nos resultados.

### 3.1 Positivos
34. ✅ Buscar sem filtros → retorna clínicas e profissionais ativos.
35. ✅ Filtrar por especialidade (ex.: `cardiology`) → só retorna quem tem a especialidade.
36. ✅ Filtrar por **cidade** → retorna clínicas cuja `city`/`addressForm.city`/`address.city` casa (ignora pontuação/acentos conforme commits recentes); profissional vinculado a clínica daquela cidade também aparece.
37. ✅ Filtrar por nome (parcial, case-insensitive) → regex.
38. ✅ Com `userLat`+`userLng` → cada resultado traz `distance` (km, 1 casa) e a lista vem **ordenada por proximidade**.
39. ✅ Com `radius=10` + localização → só retorna quem está dentro de 10 km.
40. ✅ `type=clinic` → só clínicas; `type=professional` → só profissionais.
41. ✅ **Filtro por cidade NÃO aplica corte por distância** (commit `9263b33`): buscar por cidade + ter lat/lng não deve esconder resultados longe do ponto — confirme que todos da cidade aparecem.

### 3.2 Negativos / bordas
42. ⛔ `specialty` fora do enum → erro de validação (400).
43. ⛔ `radius=600` → erro (máx. 500). `radius=0` → erro (mín. 1).
44. ⛔ `limit=51` → erro (máx. 50).
45. 🟡 `radius` enviado **sem** lat/lng → ignorado (não filtra), não dá erro.
46. 🟡 Clínica **inativa** ou com assinatura `inactive` → **não** aparece nos resultados.

### 3.3 Autocomplete de cidade — `/cities?q=`
47. ✅ Digitar 2–3 letras no filtro de cidade → sugestões via backend (commit `e25b501`, criado p/ funcionar no Brave).
48. ✅ Buscar "sao paulo" vs "São Paulo" → casa ignorando acento/pontuação (commit `bbc9022`).
49. 🟡 `q` vazio → retorna lista vazia ou default (verifique comportamento).

---

## 4. Perfil de clínica / agendamento pelo paciente

### 4.1 Página da clínica — `/clinic/:clinicId`
50. ✅ Abrir clínica a partir da busca → mostra dados e profissionais vinculados (`GET /clinics/:id/professionals`).
51. ⛔ `clinicId` inválido (não-ObjectId) → 404 "Invalid clinic ID".
52. ⛔ `clinicId` válido mas inexistente → 404.

### 4.2 Booking — `/book/:professionalId`
53. ✅ Selecionar profissional → ver slots disponíveis (`GET /availability/:professionalId/slots`) dentro de um intervalo.
54. ✅ Escolher slot e confirmar → cria agendamento; redireciona para `/book/success`.
55. ✅ Agendamento em clínica com `autoConfirm=true` → status nasce **CONFIRMED** (e dispara notificação de confirmação). Sem autoConfirm → **SCHEDULED**.
56. ✅ Profissional autônomo (sem clinicId) com `autoConfirm` próprio → mesma regra pela hierarquia.
57. ⛔ `durationMinutes` <15 ou >480 → erro de validação.
58. ⛔ `startAt` em formato não-ISO → erro de validação.
58a. ⛔ `startAt` no **passado** → 400 "Não é possível agendar em uma data passada".
58b. ⛔ Horário que **sobrepõe** outro agendamento ativo (scheduled/confirmed) do mesmo profissional → 409 "Já existe um agendamento neste horário para este profissional". (Agendamentos cancelados/concluídos não bloqueiam.)
58c. ✅ Reagendar (`PUT /appointments/:id` mudando `startAt`/`durationMinutes`) recalcula `endAt` e revalida passado/conflito; o próprio agendamento é ignorado na checagem de conflito.

---

## 5. Disponibilidade (Availability) — `/availability` (clínica/profissional)

### 5.1 Positivos
59. ✅ Definir grade semanal (dias, horário início/fim, duração do slot, intervalos/breaks) e salvar (`PUT /availability/:professionalId`) → persiste `weeklySlots` e `minCancelNoticeHours`.
60. ✅ `GET /availability/:professionalId/slots?fromDate=&toDate=` → gera os slots por dia respeitando os horários e a duração.
61. ✅ `GET /availability/:professionalId/next` → retorna o próximo dia com vaga (varre até 30 dias).
62. ✅ Slots já ocupados por agendamentos existentes não aparecem como livres (verifique sobreposição).

### 5.2 Negativos / bordas
63. ⛔ `fromDate` > `toDate` → "A data inicial deve ser anterior ou igual à data final".
64. ⛔ Intervalo > 30 dias → "Intervalo de datas muito grande; máximo de 30 dias".
65. ⛔ Datas em formato inválido → erro de validação.
66. 🟡 Profissional sem grade definida → `/slots` retorna vazio; `/next` retorna `null`.

---

## 6. Agendamentos (gestão) — `/appointments`

Transições de status válidas:
`SCHEDULED → CONFIRMED | CANCELLED` · `CONFIRMED → COMPLETED | CANCELLED` ·
`COMPLETED` e `CANCELLED` são terminais.

**Escopo de acesso (importante):** cada papel só enxerga os próprios agendamentos —
o filtro de identidade da query é **sobrescrito** pelo papel. Paciente vê os seus;
clínica vê os da sua clínica; profissional os seus; atendente herda da clínica/pro.

### 6.1 Listagem e escopo
67. ✅ Paciente lista `/appointments` → vê só os seus, mesmo passando `?patientId=` de outro (é ignorado/sobrescrito).
68. ✅ Clínica lista → vê os agendamentos da clínica dela.
69. ✅ Atendente de clínica → vê os da clínica; atendente de profissional → os do profissional.
70. ✅ Filtros `?upcoming=true` → só futuros com status scheduled/confirmed; `?date=`, `?dateFrom/dateTo`, `?status=` funcionam.
71. 🟡 Papel sem documento de clínica/profissional vinculado → lista vazia (filtro `_id: null`), não erro.

### 6.2 Mudança de status — `PATCH /appointments/:id/status`
72. ✅ SCHEDULED → CONFIRMED (clínica/atendente/profissional) → ok, notifica.
73. ✅ CONFIRMED → COMPLETED → ok.
74. ✅ SCHEDULED → CANCELLED → ok.
75. ⛔ COMPLETED → qualquer coisa → 400 "Transição de status inválida: completed → …" (terminal).
76. ⛔ CANCELLED → CONFIRMED → 400 "Transição de status inválida: cancelled → confirmed".
77. ⛔ `status` fora do enum → erro de validação.
77a. 🟡 Definir o mesmo status atual (ex.: CONFIRMED → CONFIRMED) → aceito sem erro (no-op, não dispara notificação duplicada).

### 6.3 Permissões por papel
78. ⛔ **Paciente** tentando `PATCH /:id/status` → 403 (só CLINIC/ATTENDANT/PROFESSIONAL podem; criar/cancelar tem regra própria — `DELETE` exige CLINIC/ATTENDANT, e há checagem de "Você não tem permissão para cancelar este agendamento").
79. ⛔ Paciente tentando `PUT /:id` (editar data/duração) → 403 (só CLINIC/ATTENDANT).
80. ⛔ Profissional tentando criar agendamento via `POST /appointments` → verificar (só CLINIC/ATTENDANT/PATIENT têm `@Roles` no POST).
81. ⛔ `DELETE` de agendamento que não pertence ao solicitante → 403 "Você não tem permissão para cancelar este agendamento".
82. ⛔ Editar/cancelar `:id` inexistente → 404 "Agendamento não encontrado".

---

## 7. Profissionais e vínculo com clínica

### 7.1 Profissionais — `/professionals` (clinic/attendant)
83. ✅ Clínica cria profissional → ok.
84. ✅ Vincular profissional à clínica (`POST /clinics/:clinicId/professionals/:professionalId`) → ok.
85. ✅ Listar profissionais da clínica → ok.
86. ✅ Desvincular (`DELETE`) → ok.

### 7.2 Limite por plano da clínica (assinatura)
87. ⛔ Clínica no plano **FREE** (limite 2) tentando vincular o 3º profissional → 403 "Limite de profissionais atingido para o plano atual".
88. ✅ Plano **BASIC** permite até 10; **PRO** = ilimitado (-1).
89. ✅ Assinatura em **TRIAL** de plano pago concede o limite do plano pago (não cai pro limite FREE).

---

## 8. Atendentes

Dois donos possíveis: clínica (`/clinics/:clinicId/attendants`, role CLINIC) e
profissional autônomo (`/professionals/:professionalId/attendants`, role PROFESSIONAL).

### 8.1 Positivos
90. ✅ Clínica cria atendente (username + senha) → ok, atendente passa a logar pelo fluxo de atendente.
91. ✅ Profissional cria atendente próprio → ok.
92. ✅ Editar/remover atendente → ok.

### 8.2 Limites por plano
93. ⛔ Clínica FREE (limite 2 atendentes) criando o 3º → 403 "Limite de 2 atendentes do plano atingido. Faça upgrade…". (BASIC=5, PRO=10.)
94. ⛔ Profissional FREE (limite 2) criando o 3º → 403. (basico=4, avancado=6.)

### 8.3 Permissões cruzadas
95. ⛔ Clínica A tentando gerenciar atendentes da clínica B → 403 "Você não é o responsável por este estabelecimento".
96. ⛔ Profissional acessando rota de atendentes de **clínica** (e vice-versa) → 403 (roles distintos).
97. ⛔ Atendente tentando criar outro atendente → 403 (não tem role CLINIC/PROFESSIONAL).

---

## 9. Assinaturas — `/subscription`

A rota do front escolhe a página: profissional vê `ProfessionalSubscriptionPage`,
clínica vê `SubscriptionPage`. O front envia plano/status em MAIÚSCULAS; o backend
normaliza para minúsculo.

### 9.1 Positivos
98. ✅ Ver assinatura atual (`GET /subscriptions`) → plano e status corretos.
99. ✅ Atualizar plano `FREE`→`BASIC`/`PRO` (`PUT /subscriptions`) → aceito (maiúsculo é normalizado).
100. ✅ Mudar status (trial/active/inactive) → reflete.
101. ✅ Cancelar assinatura (`DELETE /:id`) → status vira `inactive`.

### 9.2 Negativos / permissões
102. ⛔ Plano fora do enum (ex.: `ENTERPRISE`) → erro de validação.
103. ⛔ Paciente/profissional acessando assinatura **de clínica** → 403 (rotas com `@Roles(Role.CLINIC)` onde aplicável).
104. ⛔ `expiresAt` em formato não-ISO → erro de validação.
105. 🟡 Após `inactive`, confirmar que a clínica **some da busca** (item 46) e que o limite de profissionais cai para FREE.

---

## 10. Agendamento vinculado (linked scheduling) — clínica

106. ✅ Clínica ativa `linkedScheduling` (`PATCH /clinics/:id/linked-scheduling`) → flag persiste.
107. ✅ `autoConfirm` da clínica controla se agendamentos nascem confirmados (ver itens 55–56).
108. ⛔ Outra clínica/papel alterando `linked-scheduling` de uma clínica que não é sua → 403 (role CLINIC + ownership).

---

## 11. Perfil do paciente & LGPD — `/patient-profile` (role PATIENT)

109. ✅ `GET /patient-profile` → retorna perfil (ou vazio se não preenchido).
110. ✅ `PATCH /patient-profile` → upsert de dados de saúde.
111. ✅ `GET /patient-profile/export` → exporta os dados do paciente (portabilidade LGPD).
112. ✅ `PATCH /patient-profile/use-in-assistant` → liga/desliga uso dos dados no assistente.
113. ✅ `DELETE /patient-profile` → apaga os dados de saúde.
114. ⛔ Clínica/profissional acessando `/patient-profile` → 403 (`@Roles(Role.PATIENT)`).

### 11.1 Exclusão de conta — `DELETE /profile/me`
115. ✅ Paciente exclui a conta → conta removida (verifique cascata; depois login com aquele e-mail falha).
116. ⛔ Editar perfil mudando e-mail para um **já usado** por outra conta → 409 "E-mail já está em uso por outra conta".

---

## 12. Assistente de IA — `/assistant` (role PATIENT)

Sessões e mensagens protegidas por `JwtAuthGuard`; cada sessão pertence a um usuário.

117. ✅ Criar sessão (`POST /chat/sessions`) → ok; aparece em `GET /chat/sessions`.
118. ✅ Enviar mensagem (`POST /chat/sessions/:id/messages`) → recebe resposta do modelo (requer `ANTHROPIC_API_KEY` no secret).
119. ✅ Com `use-in-assistant` ligado → o contexto do paciente (perfil de saúde) entra no prompt do assistente.
120. ✅ Listar mensagens (`GET /chat/sessions/:id/messages`) → histórico na ordem.
121. ✅ Excluir sessão (`DELETE /chat/sessions/:id`) → some da lista.
122. ⛔ Acessar/enviar mensagem em sessão **de outro usuário** → 403 "Você não tem acesso a esta sessão."
123. ⛔ `:sessionId` inexistente → 404 "Sessão de chat não encontrada."
124. 🟡 Enviar nova mensagem enquanto outra ainda processa → 409 (conflito de envio concorrente — verifique a mensagem exata).
125. ⛔ Usuário não-paciente acessando o assistente → bloqueado pela rota (`patient(...)` no front; valide também no back se há `@Roles`).

---

## 13. Controle de acesso por rota (frontend)

O front protege rotas por papel via `ProtectedRoute`. Teste navegando **direto pela URL**:

126. ⛔ Paciente acessando `/dashboard`, `/professionals`, `/availability`, `/attendants`, `/subscription` → bloqueado/redirecionado (rotas `staff`/`clinicOrPro`).
127. ⛔ Clínica/profissional acessando `/home`, `/search`, `/book/:id`, `/assistant` → bloqueado (rotas `patient`).
128. ⛔ Atendente acessando `/availability` ou `/subscription` → bloqueado (`clinicOrPro` exclui attendant).
129. ✅ `/appointments`, `/notifications`, `/settings` → acessíveis por qualquer usuário autenticado.
130. ⛔ Usuário **deslogado** acessando qualquer rota protegida → vai para landing/login.
131. ✅ Rota raiz `/` deslogado → LandingPage; logado paciente → `/home`; logado staff → `/dashboard`.
132. ✅ Rotas legadas redirecionam: `/signup`→`/register`, `/booking`→`/search`, `/dashboard/professionals`→`/professionals` etc.
133. ✅ URL inexistente (`/qualquer-coisa`) → redireciona para `/`.

---

## 14. Notificações — `/notifications`

134. ✅ Ao criar agendamento → paciente/profissional recebem notificação correspondente.
135. ✅ Ao confirmar (autoConfirm ou manual) → notificação de confirmação.
136. ✅ Página de notificações lista as mensagens do usuário.

---

## 15. Robustez / borda geral (vale para todas as rotas)

137. ⛔ Qualquer rota com `:id` recebendo string não-ObjectId → 404 com mensagem do tipo "Invalid … ID".
138. 🟡 Enviar campos **extras** não declarados no DTO → são removidos silenciosamente (whitelist), requisição não falha por isso.
139. ⛔ Body ausente onde há campo obrigatório → 400 com a lista de erros de validação.
140. ✅ Token válido de um papel batendo em rota de outro papel → 403 (RolesGuard), não 401.

---

## Resumo de cobertura

| Área | Positivos | Negativos | Total |
|---|---|---|---|
| Cadastro | 9 | 10 | 19 |
| Login/Logout | 7 | 6 | 13 |
| Busca + Cidades | 12 | 4 | 16 |
| Booking/Clínica | 6 | 4 | 10 |
| Disponibilidade | 4 | 4 | 8 |
| Agendamentos | 8 | 8 | 16 |
| Profissionais/vínculo | 5 | 2 | 7 |
| Atendentes | 4 | 5 | 9 |
| Assinaturas | 5 | 4 | 9 |
| Linked scheduling | 2 | 1 | 3 |
| Perfil paciente/LGPD | 6 | 2 | 8 |
| Assistente IA | 6 | 4 | 10 |
| Acesso por rota | 4 | 5 | 9 |
| Notificações | 3 | 0 | 3 |
| Robustez geral | 1 | 3 | 4 |

> Itens marcados 🟡 são comportamentos de borda a **confirmar** (não há garantia
> explícita no código de que o resultado é o desejado — valem como pontos de atenção
> para você decidir se o comportamento atual é o esperado).
