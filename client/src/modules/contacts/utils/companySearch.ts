import axios from 'axios';

const COMPANY_SEARCH_API = 'https://firmy.servispc-liberec.cz';

export interface CompanySearchResult {
  name: string;
  ico: string;
  dic?: string;
  street: string;
  city: string;
  zipcode: string;
  obchodniJmeno?: string;
  city_part?: string;
  city_extended?: string;
  // Extended address fields (flat structure from API)
  sidlo_nazevUlice?: string;
  sidlo_cisloDomovni?: number;
  sidlo_cisloOrientacni?: number;
  sidlo_nazevObce?: string;
  sidlo_nazevCastiObce?: string;
  sidlo_psc?: number;
  sidlo_nazevKraje?: string;
  sidlo_nazevOkresu?: string;
  sidlo_textovaAdresa?: string;
  sidlo_kodStatu?: string;
  sidlo_nazevStatu?: string;
  // Original data for more details
  originaldata?: {
    ico: string;
    obchodniJmeno: string;
    dic?: string;
    sidlo?: {
      kodStatu?: string;
      nazevStatu?: string;
      nazevKraje?: string;
      nazevOkresu?: string;
      nazevObce?: string;
      nazevUlice?: string;
      cisloDomovni?: number;
      cisloOrientacni?: number;
      nazevCastiObce?: string;
      psc?: number;
      textovaAdresa?: string;
    };
    pravniForma?: string;
    datumVzniku?: string;
  };
}

export interface CompanySearchError {
  error: string;
}

export interface ParsedCompanyData {
  name: string;
  ico: string;
  dic?: string;
  // Address fields
  street: string;
  city: string;
  cityPart?: string;
  zip: string;
  region?: string;
  district?: string;
  country: string;
  fullAddress?: string;
  // Registration info
  registrationInfo?: string;
  legalForm?: string;
  foundedDate?: string;
}

// Map court codes to full names
const courtNames: Record<string, string> = {
  'MSPH': 'Městským soudem v Praze',
  'KSCB': 'Krajským soudem v Českých Budějovicích',
  'KSHK': 'Krajským soudem v Hradci Králové',
  'KSPL': 'Krajským soudem v Plzni',
  'KSUL': 'Krajským soudem v Ústí nad Labem',
  'KSBR': 'Krajským soudem v Brně',
  'KSOS': 'Krajským soudem v Ostravě',
  'KSOL': 'Krajským soudem v Olomouci',
};

// Map legal form codes to names
const legalForms: Record<string, string> = {
  '101': 'Fyzická osoba podnikající dle živnostenského zákona',
  '111': 'Veřejná obchodní společnost',
  '112': 'Společnost s ručením omezeným',
  '113': 'Společnost komanditní',
  '117': 'Nadace',
  '118': 'Nadační fond',
  '121': 'Akciová společnost',
  '141': 'Obecně prospěšná společnost',
  '145': 'Společenství vlastníků jednotek',
  '205': 'Družstvo',
  '301': 'Státní podnik',
  '331': 'Příspěvková organizace',
  '421': 'Zahraniční osoba',
  '706': 'Spolek',
  '736': 'Pobočný spolek',
};

/**
 * Parse registration info from spisovaZnacka (e.g. "C 144726/MSPH")
 */
function parseRegistrationInfo(spisovaZnacka: string): string | undefined {
  // Format: "C 144726/MSPH" -> oddíl C, vložka 144726, soud MSPH
  const match = spisovaZnacka.match(/^([A-Z]+)\s*(\d+)\/([A-Z]+)$/);
  if (!match) return undefined;

  const [, oddil, vlozka, soudKod] = match;
  const soudNazev = courtNames[soudKod] || `soudem (${soudKod})`;

  return `Zapsáno v obchodním rejstříku vedeném ${soudNazev}, oddíl ${oddil}, vložka ${vlozka}`;
}

/**
 * Parse company search result into a structured format for the form
 */
export function parseCompanyData(result: CompanySearchResult): ParsedCompanyData {
  const sidlo = result.originaldata?.sidlo;

  // Build street address from components if available
  let street = result.street;
  if (sidlo?.nazevUlice) {
    street = sidlo.nazevUlice;
    if (sidlo.cisloDomovni) {
      street += ` ${sidlo.cisloDomovni}`;
      if (sidlo.cisloOrientacni) {
        street += `/${sidlo.cisloOrientacni}`;
      }
    }
  } else if (result.sidlo_nazevUlice) {
    street = result.sidlo_nazevUlice;
    if (result.sidlo_cisloDomovni) {
      street += ` ${result.sidlo_cisloDomovni}`;
      if (result.sidlo_cisloOrientacni) {
        street += `/${result.sidlo_cisloOrientacni}`;
      }
    }
  }

  // Extract registration info from dalsiUdaje (vr = veřejný rejstřík)
  let registrationInfo: string | undefined;
  const dalsiUdaje = (result.originaldata as any)?.dalsiUdaje;
  if (Array.isArray(dalsiUdaje)) {
    const vrData = dalsiUdaje.find((d: any) => d.datovyZdroj === 'vr' && d.spisovaZnacka);
    if (vrData?.spisovaZnacka) {
      registrationInfo = parseRegistrationInfo(vrData.spisovaZnacka);
    }
  }

  // Get legal form name
  const pravniFormaKod = result.originaldata?.pravniForma || (result as any).pravniForma;
  const legalForm = pravniFormaKod ? legalForms[pravniFormaKod] : undefined;

  // Get founded date
  const foundedDate = result.originaldata?.datumVzniku || (result as any).datumVzniku;

  return {
    name: result.obchodniJmeno || result.originaldata?.obchodniJmeno || result.name,
    ico: result.ico,
    dic: result.dic || result.originaldata?.dic,
    street,
    city: sidlo?.nazevObce || result.sidlo_nazevObce || result.city,
    cityPart: sidlo?.nazevCastiObce || result.sidlo_nazevCastiObce || result.city_part,
    zip: String(sidlo?.psc || result.sidlo_psc || result.zipcode || '').replace(/\s/g, ''),
    region: sidlo?.nazevKraje || result.sidlo_nazevKraje,
    district: sidlo?.nazevOkresu || result.sidlo_nazevOkresu,
    country: sidlo?.kodStatu || result.sidlo_kodStatu || 'CZ',
    fullAddress: sidlo?.textovaAdresa || result.sidlo_textovaAdresa,
    registrationInfo,
    legalForm,
    foundedDate,
  };
}

/**
 * Check if response is an error
 */
function isErrorResponse(data: any): data is CompanySearchError {
  return data && typeof data === 'object' && 'error' in data;
}

/**
 * Search companies by IČO (company registration number)
 * API returns a single object when IČO matches, or error object if invalid
 */
export async function searchByIco(ico: string): Promise<CompanySearchResult[]> {
  if (!ico || ico.length < 3) {
    return [];
  }

  try {
    const response = await axios.get<CompanySearchResult | CompanySearchError>(COMPANY_SEARCH_API, {
      params: { ico },
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = response.data;

    // Check for error response
    if (isErrorResponse(data)) {
      console.warn('Company search error:', data.error);
      return [];
    }

    // Single object response - wrap in array
    if (data && typeof data === 'object' && 'ico' in data) {
      return [data as CompanySearchResult];
    }

    // Unexpected format
    return [];
  } catch (error) {
    console.error('Company search by ICO failed:', error);
    return [];
  }
}

/**
 * Search companies by name
 */
export async function searchByName(name: string): Promise<CompanySearchResult[]> {
  if (!name || name.length < 2) {
    return [];
  }

  try {
    const response = await axios.get<CompanySearchResult[]>(COMPANY_SEARCH_API, {
      params: { name },
      headers: {
        'Accept': 'application/json',
      },
    });
    return response.data || [];
  } catch (error) {
    console.error('Company search by name failed:', error);
    return [];
  }
}

/**
 * Search companies by either ICO or name (auto-detect)
 */
export async function searchCompanies(query: string): Promise<CompanySearchResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  // If query contains only digits, search by ICO
  const isIco = /^\d+$/.test(query.trim());

  if (isIco) {
    return searchByIco(query.trim());
  } else {
    return searchByName(query.trim());
  }
}

// ─── VIES VAT Validation (EU) ───────────────────────────────────

const VIES_API = 'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number';

export interface ViesResult {
  countryCode: string;
  vatNumber: string;
  requestDate: string;
  valid: boolean;
  name: string;
  address: string;
  traderName: string;
  traderStreet: string;
  traderPostalCode: string;
  traderCity: string;
  traderCompanyType: string;
}

export interface ViesParsedResult {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name: string;
  address: string;
  street: string;
  city: string;
  zip: string;
}

/**
 * Validate and lookup a VAT number via VIES (EU VAT validation).
 * Input: full VAT ID like "CZ06691439" or country code + number separately.
 */
export async function validateVatVies(vatId: string): Promise<ViesParsedResult | null> {
  if (!vatId || vatId.length < 4) return null;

  // Extract country code (first 2 letters) and number
  const cleaned = vatId.replace(/\s/g, '').toUpperCase();
  const countryCode = cleaned.substring(0, 2);
  const vatNumber = cleaned.substring(2);

  if (!/^[A-Z]{2}$/.test(countryCode) || !vatNumber) return null;

  try {
    const response = await axios.post<ViesResult>(VIES_API, {
      countryCode,
      vatNumber,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    const data = response.data;

    // Parse address from traderStreet/City/PostalCode or fallback to address string
    let street = data.traderStreet && data.traderStreet !== '---' ? data.traderStreet : '';
    let city = data.traderCity && data.traderCity !== '---' ? data.traderCity : '';
    let zip = data.traderPostalCode && data.traderPostalCode !== '---' ? data.traderPostalCode : '';
    const name = data.traderName && data.traderName !== '---' ? data.traderName : (data.name || '');

    // If trader fields are empty, try parsing the address string
    if (!street && !city && data.address) {
      const parts = data.address.split('\n').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        street = parts[0];
        // Last part often has zip + city
        const lastPart = parts[parts.length - 1];
        const zipCityMatch = lastPart.match(/^(\d{3}\s?\d{2})\s+(.+)$/);
        if (zipCityMatch) {
          zip = zipCityMatch[1].replace(/\s/g, '');
          city = zipCityMatch[2];
        } else {
          city = lastPart;
        }
      }
    }

    return {
      valid: data.valid,
      countryCode,
      vatNumber,
      name,
      address: data.address || '',
      street,
      city,
      zip,
    };
  } catch (error) {
    console.error('VIES VAT validation failed:', error);
    return null;
  }
}

/**
 * Auto-detect whether to use ARES (Czech IČO/name) or VIES (EU VAT ID).
 * - Starts with 2 letters (country code) → VIES
 * - Pure digits → ARES by IČO
 * - Text → ARES by name
 */
export async function smartCompanySearch(query: string): Promise<{
  source: 'ares' | 'vies';
  results: CompanySearchResult[];
  viesResult?: ViesParsedResult | null;
}> {
  const cleaned = query.trim();
  if (!cleaned || cleaned.length < 2) {
    return { source: 'ares', results: [] };
  }

  // Check if it looks like an EU VAT ID (2 letters + digits)
  const vatPattern = /^[A-Za-z]{2}\d/;
  if (vatPattern.test(cleaned) && cleaned.length >= 4) {
    const viesResult = await validateVatVies(cleaned);
    if (viesResult) {
      // Convert VIES result to CompanySearchResult format for unified handling
      const results: CompanySearchResult[] = viesResult.name ? [{
        name: viesResult.name,
        ico: viesResult.vatNumber,
        dic: `${viesResult.countryCode}${viesResult.vatNumber}`,
        street: viesResult.street,
        city: viesResult.city,
        zipcode: viesResult.zip,
      }] : [];
      return { source: 'vies', results, viesResult };
    }
    return { source: 'vies', results: [], viesResult };
  }

  // Default: ARES search
  const results = await searchCompanies(cleaned);
  return { source: 'ares', results };
}

export const companySearchApi = {
  searchByIco,
  searchByName,
  searchCompanies,
  parseCompanyData,
  validateVatVies,
  smartCompanySearch,
};
