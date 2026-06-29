// Shared helpers for MCP tool results.

export function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function jsonResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

// Compute chronological age (years) from an ISO date-of-birth string.
export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export const calculateMAP = (systolic: number, diastolic: number): number =>
  Math.round(((systolic + 2 * diastolic) / 3) * 100) / 100;

export const calculatePulsePressure = (systolic: number, diastolic: number): number =>
  systolic - diastolic;
