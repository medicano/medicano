// Ações registradas no histórico de atividade (RF64). Conjunto pequeno e
// deliberado — cobre as ações de atendente/profissional que já existem hoje
// (gestão de atendentes). Novas ações são adicionadas aqui conforme os pontos
// de chamada forem integrados.
export enum ActivityAction {
  ATTENDANT_CREATED = 'attendant_created',
  ATTENDANT_UPDATED = 'attendant_updated',
  ATTENDANT_REMOVED = 'attendant_removed',
}
