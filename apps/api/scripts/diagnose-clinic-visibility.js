// Read-only diagnostic: why clinic professionals don't show in patient search.
//
// Patient search only returns clinics/professionals whose clinic has an
// active/trial subscription. Professionals are gated by the subscription of the
// clinic they're LINKED to (ClinicProfessional). When a clinic-role user ends
// up with more than one Clinic document (e.g. a legacy string-userId clinic plus
// an upserted ObjectId-userId one), the subscription sits on clinic A while the
// professionals are linked to clinic B — so the clinic shows but its
// professionals vanish from search.
//
// This script ONLY READS. It reports the broken cases; it changes nothing.
//
// Usage:
//   mongosh "<MONGODB_URI>" apps/api/scripts/diagnose-clinic-visibility.js

const clinics = db.getCollection('clinics');
const subs = db.getCollection('subscriptions');
const links = db.getCollection('clinicprofessionals');

const ACTIVE = ['active', 'trial'];

function asId(v) {
  return v && v.toString ? v.toString() : String(v);
}

// 1) Clinic-users with duplicate clinic documents
print('\n=== Usuários com clínicas DUPLICADAS ===');
const dupAgg = clinics.aggregate([
  { $group: { _id: '$userId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
  { $match: { count: { $gt: 1 } } },
]).toArray();

if (dupAgg.length === 0) {
  print('  nenhum');
} else {
  dupAgg.forEach((row) => {
    print(`  userId=${asId(row._id)} tem ${row.count} clínicas:`);
    row.ids.forEach((cid) => {
      const subCount = subs.countDocuments({ clinicId: cid, status: { $in: ACTIVE } });
      const linkCount = links.countDocuments({ clinicId: cid });
      print(`    clinic=${asId(cid)}  subscriptionAtiva=${subCount > 0 ? 'SIM' : 'NÃO'}  profissionaisVinculados=${linkCount}`);
    });
  });
}

// 2) Clinics with at least one linked professional but NO active subscription
//    → these professionals are invisible in search.
print('\n=== Clínicas com profissionais mas SEM subscription ativa (profissionais somem na busca) ===');
let hiddenTotal = 0;
clinics.find({}, { _id: 1, name: 1 }).forEach((c) => {
  const linkCount = links.countDocuments({ clinicId: c._id });
  if (linkCount === 0) return;
  const subCount = subs.countDocuments({ clinicId: c._id, status: { $in: ACTIVE } });
  if (subCount === 0) {
    hiddenTotal += linkCount;
    print(`  clinic=${asId(c._id)} "${c.name}" → ${linkCount} profissional(is) escondido(s)`);
  }
});
if (hiddenTotal === 0) print('  nenhum');

// 3) Summary
print('\n=== Resumo ===');
print(`  clínicas: ${clinics.countDocuments({})}`);
print(`  clínicas sem subscription (qualquer status): ${clinics.countDocuments({}) - subs.distinct('clinicId').length}`);
print(`  usuários com clínica duplicada: ${dupAgg.length}`);
print(`  profissionais escondidos por falta de subscription na clínica vinculada: ${hiddenTotal}`);
