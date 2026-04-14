/**
 * Derive a display school name from a U.S. .edu email.
 * Uses registrable domain (last two labels, e.g. mail.jhu.edu → jhu.edu) and a lookup table,
 * with a readable fallback when the school is not in the table.
 */

/** @param {string} email */
export function getRegistrableEduDomain(email) {
  if (typeof email !== "string") return "";
  const t = email.trim().toLowerCase();
  const at = t.lastIndexOf("@");
  if (at <= 0) return "";
  const host = t.slice(at + 1);
  if (!host.endsWith(".edu")) return "";
  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2 || parts[parts.length - 1] !== "edu") return "";
  return parts.slice(-2).join(".");
}

const KNOWN_SCHOOLS = {
  "jhu.edu": "Johns Hopkins University",
  "stanford.edu": "Stanford University",
  "mit.edu": "Massachusetts Institute of Technology",
  "harvard.edu": "Harvard University",
  "yale.edu": "Yale University",
  "princeton.edu": "Princeton University",
  "columbia.edu": "Columbia University",
  "cornell.edu": "Cornell University",
  "upenn.edu": "University of Pennsylvania",
  "brown.edu": "Brown University",
  "dartmouth.edu": "Dartmouth College",
  "duke.edu": "Duke University",
  "northwestern.edu": "Northwestern University",
  "uchicago.edu": "University of Chicago",
  "caltech.edu": "California Institute of Technology",
  "cmu.edu": "Carnegie Mellon University",
  "gatech.edu": "Georgia Institute of Technology",
  "berkeley.edu": "University of California, Berkeley",
  "ucla.edu": "University of California, Los Angeles",
  "ucsd.edu": "University of California, San Diego",
  "uci.edu": "University of California, Irvine",
  "ucsb.edu": "University of California, Santa Barbara",
  "umich.edu": "University of Michigan",
  "umd.edu": "University of Maryland",
  "virginia.edu": "University of Virginia",
  "unc.edu": "University of North Carolina at Chapel Hill",
  "wisc.edu": "University of Wisconsin–Madison",
  "illinois.edu": "University of Illinois Urbana-Champaign",
  "utexas.edu": "The University of Texas at Austin",
  "tamu.edu": "Texas A&M University",
  "nyu.edu": "New York University",
  "usc.edu": "University of Southern California",
  "bu.edu": "Boston University",
  "bc.edu": "Boston College",
  "gwu.edu": "George Washington University",
  "georgetown.edu": "Georgetown University",
  "vanderbilt.edu": "Vanderbilt University",
  "rice.edu": "Rice University",
  "washu.edu": "Washington University in St. Louis",
  "emory.edu": "Emory University",
  "tufts.edu": "Tufts University",
  "brandeis.edu": "Brandeis University",
  "case.edu": "Case Western Reserve University",
  "rutgers.edu": "Rutgers University",
  "psu.edu": "Penn State University",
  "osu.edu": "The Ohio State University",
  "purdue.edu": "Purdue University",
  "umn.edu": "University of Minnesota",
  "washington.edu": "University of Washington",
  "colorado.edu": "University of Colorado Boulder",
  "asu.edu": "Arizona State University",
  "ufl.edu": "University of Florida",
  "fsu.edu": "Florida State University",
  "uga.edu": "University of Georgia",
  "vt.edu": "Virginia Tech",
  "wfu.edu": "Wake Forest University",
  "emerson.edu": "Emerson College",
};

function humanizeUnknownSchool(registrableDomain) {
  const sld = registrableDomain.replace(/\.edu$/i, "").split(".").pop() || "";
  if (!sld) return registrableDomain.replace(/\.edu$/i, "").replace(/\./g, " ");
  const slug = sld.replace(/-/g, " ");
  const words = slug.split(/\s+/).map((w) => {
    if (w.length <= 3 && /^[a-z]+$/i.test(w)) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
  return `${words.join(" ")} University`;
}

export function getSchoolFromEmail(email) {
  const domain = getRegistrableEduDomain(email);
  if (!domain) return "Unknown school";
  const key = domain.toLowerCase();
  if (KNOWN_SCHOOLS[key]) return KNOWN_SCHOOLS[key];
  return humanizeUnknownSchool(key);
}
