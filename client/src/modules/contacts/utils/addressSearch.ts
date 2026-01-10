// OpenStreetMap Nominatim API for address autocomplete

export interface AddressResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
    country?: string;
  };
}

/**
 * Search for addresses using OpenStreetMap Nominatim API
 * @param query - Search query (address)
 * @param countryCode - Limit to specific country (default: cz for Czech Republic)
 */
export async function searchAddresses(
  query: string,
  countryCode: string = "cz"
): Promise<AddressResult[]> {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      limit: "5",
      countrycodes: countryCode,
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "Accept-Language": "cs,en",
          // Nominatim requires a User-Agent header
          "User-Agent": "FolkloreGardenAdmin/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Address search failed");
    }

    const data: AddressResult[] = await response.json();
    return data;
  } catch (error) {
    console.error("Address search error:", error);
    return [];
  }
}

/**
 * Format address result to a readable string
 */
export function formatAddress(result: AddressResult): string {
  return result.display_name;
}

/**
 * Get short address (street + city)
 */
export function getShortAddress(result: AddressResult): string {
  const parts: string[] = [];

  if (result.address) {
    if (result.address.road) {
      let street = result.address.road;
      if (result.address.house_number) {
        street += ` ${result.address.house_number}`;
      }
      parts.push(street);
    }

    const city = result.address.city || result.address.town || result.address.village;
    if (city) {
      parts.push(city);
    }
  }

  return parts.length > 0 ? parts.join(", ") : result.display_name;
}
