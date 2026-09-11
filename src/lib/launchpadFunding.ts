export function parseLaunchpadFunding(raw: string): number {
  const value = raw.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error('Enter a funding amount using numbers and at most two decimal places.');
  }
  const [whole, fraction = ''] = value.split('.');
  const kobo = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(kobo)) {
    throw new Error('Enter an amount small enough to preserve its exact kobo value.');
  }
  return kobo / 100;
}
