function parseBirthDateParts(
  value: string
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
}

export function normalizeEntryCode(
  value: string
) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function normalizeBirthDate(
  value: string
) {
  const parts = parseBirthDateParts(value);

  if (!parts) {
    return null;
  }

  return `${String(parts.year).padStart(
    4,
    "0"
  )}-${String(parts.month).padStart(
    2,
    "0"
  )}-${String(parts.day).padStart(
    2,
    "0"
  )}`;
}

export function deriveAgeFromBirthDate(
  value: string,
  referenceDate: Date = new Date()
) {
  const parts = parseBirthDateParts(value);

  if (!parts) {
    return null;
  }

  const currentYear =
    referenceDate.getFullYear();
  const currentMonth =
    referenceDate.getMonth() + 1;
  const currentDay =
    referenceDate.getDate();

  let age = currentYear - parts.year;
  const hasHadBirthdayThisYear =
    currentMonth > parts.month ||
    (currentMonth === parts.month &&
      currentDay >= parts.day);

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function deriveBirthYear(
  value: string
) {
  const parts = parseBirthDateParts(value);
  return parts?.year ?? null;
}
