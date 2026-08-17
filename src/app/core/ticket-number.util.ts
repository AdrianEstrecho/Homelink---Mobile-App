// Ported from frontend/src/utils/ticketNumber.js — must stay in sync with
// backend/utils/ticketNumber.js by hand (no shared module between them).
export function formatTicketNo(n: number): string {
  return `TKT-${String(n).padStart(5, '0')}`;
}
