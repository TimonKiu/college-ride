/**
 * U.S. institutional email: hostname must end with `.edu` (e.g. @jhu.edu, @mail.umich.edu).
 * Does not include foreign domains like .ac.uk; extend the check if you add international schools.
 */
export function isInstitutionalEduEmail(email) {
  if (typeof email !== "string") return false;
  const t = email.trim().toLowerCase();
  const at = t.lastIndexOf("@");
  if (at <= 0) return false;
  const domain = t.slice(at + 1);
  if (!domain || domain.includes("@") || domain.includes(" ")) return false;
  return domain.endsWith(".edu");
}
