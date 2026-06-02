// One-time migration: rename the "triage" naming to "assistant" in stored data.
//
// The product feature was renamed from "triagem" to "assistente". Two pieces of
// persisted data still carry the old names and must be realigned so existing
// records keep working with the updated code:
//
//   1. chatsessions.type: 'triage'         -> 'assistant'
//                         'symptom_triage'  -> 'symptom_assistant'
//   2. patientprofiles.useInTriage (field)  -> useInAssistant
//
// Usage:
//   mongosh "<MONGODB_URI>" apps/api/scripts/rename-triage-to-assistant.js
//
// Safe to run multiple times: each step only touches documents that still hold
// the old value/field name.

// ── 1. Chat session type ───────────────────────────────────────────────────
const sessions = db.getCollection('chatsessions');

const triageToAssistant = sessions.updateMany(
  { type: 'triage' },
  { $set: { type: 'assistant' } },
);
print(`chatsessions: ${triageToAssistant.modifiedCount} 'triage' -> 'assistant'`);

const symptomToAssistant = sessions.updateMany(
  { type: 'symptom_triage' },
  { $set: { type: 'symptom_assistant' } },
);
print(
  `chatsessions: ${symptomToAssistant.modifiedCount} 'symptom_triage' -> 'symptom_assistant'`,
);

// ── 2. Patient profile opt-in field ─────────────────────────────────────────
const profiles = db.getCollection('patientprofiles');

const renamedField = profiles.updateMany(
  { useInTriage: { $exists: true } },
  { $rename: { useInTriage: 'useInAssistant' } },
);
print(
  `patientprofiles: ${renamedField.modifiedCount} useInTriage -> useInAssistant`,
);
