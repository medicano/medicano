// One-time repair: consolidate duplicate Clinic documents per user and ensure
// every clinic has a subscription.
//
// WHY: patient search gates clinics AND their professionals by the clinic's
// subscription (active/trial). When a clinic-role user ended up with two Clinic
// documents (a legacy string-userId clinic + an upserted ObjectId-userId one, or
// one created via POST /clinics), the subscription landed on clinic A while the
// professionals were linked to clinic B — so the clinic showed in search but its
// professionals vanished. This merges each user's clinics into one canonical
// clinic, re-points every reference, and guarantees a subscription.
//
// The canonical clinic is the one with the most linked professionals (the one
// users actually populated); ties break toward an active subscription, then the
// oldest _id. All references on the duplicates are moved to it, then the
// duplicates are deleted.
//
// SAFE BY DEFAULT: runs as a DRY-RUN and changes nothing. Review the output,
// then re-run with APPLY=1 to persist.
//
// Usage:
//   mongosh "<MONGODB_URI>" apps/api/scripts/repair-duplicate-clinics.js              # dry-run
//   APPLY=1 mongosh "<MONGODB_URI>" apps/api/scripts/repair-duplicate-clinics.js      # apply
//
// Idempotent: re-running after a successful apply is a no-op.

const APPLY = typeof process !== 'undefined' && process.env && process.env.APPLY === '1';
print(APPLY ? '\n*** MODO APPLY — alterações serão persistidas ***' : '\n*** DRY-RUN — nada será alterado (use APPLY=1 para aplicar) ***');

const clinics = db.getCollection('clinics');
const subs = db.getCollection('subscriptions');
const links = db.getCollection('clinicprofessionals');
const appts = db.getCollection('appointments');
const chats = db.getCollection('chatsessions');
const users = db.getCollection('users');

const ACTIVE = ['active', 'trial'];
const idEq = (id) => ({ $in: [id, id.toString()] }); // tolera userId/clinicId legado como string

let mergedClinics = 0;
let movedLinks = 0;
let deletedDupLinks = 0;
let movedAppts = 0;
let movedChats = 0;
let movedAttendants = 0;
let movedSubs = 0;
let deletedSubs = 0;
let createdSubs = 0;
let deletedClinics = 0;

// ── 1) Consolidar clínicas duplicadas por usuário ──────────────────────────────
const dupGroups = clinics.aggregate([
  { $group: { _id: '$userId', ids: { $push: '$_id' }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } },
]).toArray();

print(`\n=== ${dupGroups.length} usuário(s) com clínicas duplicadas ===`);

for (const group of dupGroups) {
  const clinicIds = group.ids;

  // escolhe canônica: mais profissionais vinculados → tem subscription ativa → mais antiga
  const scored = clinicIds.map((cid) => ({
    cid,
    linkCount: links.countDocuments({ clinicId: cid }),
    hasActiveSub: subs.countDocuments({ clinicId: cid, status: { $in: ACTIVE } }) > 0,
  }));
  scored.sort((a, b) => {
    if (b.linkCount !== a.linkCount) return b.linkCount - a.linkCount;
    if (a.hasActiveSub !== b.hasActiveSub) return a.hasActiveSub ? -1 : 1;
    return a.cid.toString() < b.cid.toString() ? -1 : 1;
  });
  const canonical = scored[0].cid;
  const duplicates = scored.slice(1).map((s) => s.cid);

  print(`\nuserId=${group._id} → canônica=${canonical} (mantém), duplicadas=[${duplicates.join(', ')}]`);

  for (const dup of duplicates) {
    // 1a) clinicprofessionals (índice único {clinicId, professionalId})
    links.find({ clinicId: dup }).forEach((l) => {
      const clash = links.countDocuments({ clinicId: canonical, professionalId: l.professionalId }) > 0;
      if (clash) {
        print(`  link prof=${l.professionalId}: já existe na canônica → remove o duplicado`);
        if (APPLY) links.deleteOne({ _id: l._id });
        deletedDupLinks += 1;
      } else {
        print(`  link prof=${l.professionalId}: re-aponta ${dup} → ${canonical}`);
        if (APPLY) links.updateOne({ _id: l._id }, { $set: { clinicId: canonical } });
        movedLinks += 1;
      }
    });

    // 1b) appointments
    const apptCount = appts.countDocuments({ clinicId: dup });
    if (apptCount) {
      print(`  appointments: re-aponta ${apptCount} de ${dup} → ${canonical}`);
      if (APPLY) appts.updateMany({ clinicId: dup }, { $set: { clinicId: canonical } });
      movedAppts += apptCount;
    }

    // 1c) chatsessions
    const chatCount = chats.countDocuments({ clinicId: dup });
    if (chatCount) {
      print(`  chatsessions: re-aponta ${chatCount} de ${dup} → ${canonical}`);
      if (APPLY) chats.updateMany({ clinicId: dup }, { $set: { clinicId: canonical } });
      movedChats += chatCount;
    }

    // 1d) users (atendentes) — índice único {clinicId, username}
    users.find({ clinicId: dup }).forEach((u) => {
      const clash = users.countDocuments({ clinicId: canonical, username: u.username }) > 0;
      if (clash) {
        print(`  ATENÇÃO: atendente username="${u.username}" colide na canônica — re-aponte manualmente (user=${u._id})`);
      } else {
        print(`  atendente ${u._id}: re-aponta ${dup} → ${canonical}`);
        if (APPLY) users.updateOne({ _id: u._id }, { $set: { clinicId: canonical } });
        movedAttendants += 1;
      }
    });

    // 1e) mescla specialties + backfill de campos de perfil VAZIOS na canônica
    //     (não toca campos únicos como cnpj/customCode para evitar colisão)
    const dupDoc = clinics.findOne({ _id: dup });
    const canonDoc = clinics.findOne({ _id: canonical });
    if (dupDoc) {
      if (Array.isArray(dupDoc.specialties) && dupDoc.specialties.length) {
        if (APPLY) clinics.updateOne({ _id: canonical }, { $addToSet: { specialties: { $each: dupDoc.specialties } } });
      }
      const isEmpty = (v) => v === undefined || v === null || v === '';
      const backfill = {};
      ['name', 'phone', 'email', 'addressText', 'address', 'lat', 'lng', 'description'].forEach((f) => {
        if (isEmpty(canonDoc[f]) && !isEmpty(dupDoc[f])) backfill[f] = dupDoc[f];
      });
      if (Object.keys(backfill).length) {
        print(`  backfill na canônica: ${Object.keys(backfill).join(', ')}`);
        if (APPLY) clinics.updateOne({ _id: canonical }, { $set: backfill });
      }
    }

    // 1f) remove a clínica duplicada
    print(`  remove clínica duplicada ${dup}`);
    if (APPLY) clinics.deleteOne({ _id: dup });
    deletedClinics += 1;
  }

  // 1g) subscription: garante exatamente uma na canônica
  const canonicalHasSub = subs.countDocuments({ clinicId: canonical }) > 0;
  const dupSubs = subs.find({ clinicId: { $in: duplicates } }).sort({ updatedAt: -1 }).toArray();
  if (!canonicalHasSub && dupSubs.length) {
    // prefere uma ativa/trial; senão a mais recente
    const best = dupSubs.find((s) => ACTIVE.indexOf(s.status) !== -1) || dupSubs[0];
    print(`  subscription: move ${best._id} (${best.status}) → canônica`);
    if (APPLY) subs.updateOne({ _id: best._id }, { $set: { clinicId: canonical } });
    movedSubs += 1;
    for (const s of dupSubs) {
      if (s._id.toString() === best._id.toString()) continue;
      if (APPLY) subs.deleteOne({ _id: s._id });
      deletedSubs += 1;
    }
  } else {
    for (const s of dupSubs) {
      print(`  subscription órfã ${s._id} (${s.status}) → remove`);
      if (APPLY) subs.deleteOne({ _id: s._id });
      deletedSubs += 1;
    }
  }

  mergedClinics += 1;
}

// ── 2) Garante subscription para TODA clínica (cobre o gap do upsert sem assinatura) ──
print('\n=== Clínicas sem subscription (cria free/trial) ===');
let withoutSub = 0;
clinics.find({}, { _id: 1, name: 1 }).forEach((c) => {
  if (subs.countDocuments({ clinicId: c._id }) === 0) {
    withoutSub += 1;
    print(`  clinic=${c._id} "${c.name}" → cria subscription free/trial`);
    if (APPLY) {
      const now = new Date();
      subs.insertOne({ clinicId: c._id, plan: 'free', status: 'trial', createdAt: now, updatedAt: now });
    }
    createdSubs += 1;
  }
});
if (withoutSub === 0) print('  nenhuma');

// ── Resumo ──────────────────────────────────────────────────────────────────────
print('\n=== Resumo ===');
print(`  usuários com duplicatas consolidados: ${mergedClinics}`);
print(`  clínicas duplicadas removidas:        ${deletedClinics}`);
print(`  vínculos re-apontados:                ${movedLinks}`);
print(`  vínculos duplicados removidos:        ${deletedDupLinks}`);
print(`  appointments re-apontados:            ${movedAppts}`);
print(`  chatsessions re-apontadas:            ${movedChats}`);
print(`  atendentes re-apontados:              ${movedAttendants}`);
print(`  subscriptions movidas:                ${movedSubs}`);
print(`  subscriptions removidas:              ${deletedSubs}`);
print(`  subscriptions criadas:                ${createdSubs}`);
print(APPLY ? '\n*** APPLY concluído ***' : '\n*** DRY-RUN concluído — re-rode com APPLY=1 para aplicar ***');
