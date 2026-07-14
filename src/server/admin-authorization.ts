type AdminCandidate = {
  uid: string;
  email?: unknown;
  email_verified?: unknown;
};

export function isBugReportInboxAdmin(user: AdminCandidate) {
  const allowedUids = getCsvEnvSet(process.env.IROGUIDE_ADMIN_UIDS);
  const allowedEmails = getCsvEnvSet(process.env.IROGUIDE_ADMIN_EMAILS);
  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";

  return allowedUids.has(user.uid) || (user.email_verified === true && email.length > 0 && allowedEmails.has(email));
}

function getCsvEnvSet(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}
