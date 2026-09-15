// Permissões granulares do atendente (RF65) — substitui o modelo anterior
// tudo-ou-nada. O conjunto default (criado em AttendantsService) replica o
// comportamento anterior: agenda + agendamentos, sem acesso a relatórios.
export enum AttendantPermission {
  VIEW_AGENDA = 'view_agenda',
  MANAGE_APPOINTMENTS = 'manage_appointments',
  VIEW_REPORTS = 'view_reports',
}

export const DEFAULT_ATTENDANT_PERMISSIONS: AttendantPermission[] = [
  AttendantPermission.VIEW_AGENDA,
  AttendantPermission.MANAGE_APPOINTMENTS,
];
