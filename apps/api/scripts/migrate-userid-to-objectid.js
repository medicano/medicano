// One-time migration: convert `userId` stored as a string into a real ObjectId.
//
// Some documents were created while `userId` was typed as String, but the
// app now looks profiles up by ObjectId — so those records became unreachable
// (e.g. settings showing "Perfil não encontrado"). This realigns the data.
//
// Usage:
//   mongosh "<MONGODB_URI>" apps/api/scripts/migrate-userid-to-objectid.js
//
// Safe to run multiple times: it only touches documents whose userId is still
// a string, and skips anything that isn't a valid ObjectId.

const collections = ['clinics', 'professionals', 'patients'];

for (const name of collections) {
  const coll = db.getCollection(name);
  let migrated = 0;
  let skipped = 0;

  coll.find({ userId: { $type: 'string' } }).forEach((doc) => {
    if (ObjectId.isValid(doc.userId)) {
      coll.updateOne({ _id: doc._id }, { $set: { userId: new ObjectId(doc.userId) } });
      migrated += 1;
    } else {
      skipped += 1;
      print(`${name}: skipped ${doc._id} — userId "${doc.userId}" is not a valid ObjectId`);
    }
  });

  print(`${name}: ${migrated} migrated, ${skipped} skipped`);
}
