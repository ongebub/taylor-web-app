/**
 * Generate a URL slug from customer last name + street address.
 * "John Smith" + "123 Main St, Des Moines, IA 50309" → "smith-123-main-st"
 */
export function generateSlug(customerName: string, streetAddress: string): string {
  // Last word of customer name
  const nameParts = customerName.trim().split(/\s+/);
  const lastName = nameParts[nameParts.length - 1] || "";

  // Strip everything after first comma, then take first 3 words (number + street name)
  const streetOnly = streetAddress.split(",")[0].trim();
  const streetParts = streetOnly.split(/\s+/).slice(0, 3).join(" ");

  const raw = `${lastName} ${streetParts}`.trim();
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Combine split address fields into a single display string.
 */
export function formatFullAddress(
  streetAddress: string,
  city: string,
  state: string,
  zip: string
): string {
  const parts: string[] = [];
  if (streetAddress) parts.push(streetAddress);
  const cityStateZip = [city, state].filter(Boolean).join(", ");
  if (cityStateZip && zip) {
    parts.push(`${cityStateZip} ${zip}`);
  } else if (cityStateZip) {
    parts.push(cityStateZip);
  } else if (zip) {
    parts.push(zip);
  }
  return parts.join(", ");
}
