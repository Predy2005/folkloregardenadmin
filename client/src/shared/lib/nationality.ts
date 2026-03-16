/**
 * Mapping of nationality codes/names to ISO 3166-1 alpha-2 country codes
 * Used for displaying country flags
 */
export const NATIONALITY_TO_ISO: Record<string, string> = {
  // Czech
  cz: "CZ", czech: "CZ", cze: "CZ",
  // German
  de: "DE", german: "DE", deu: "DE", ger: "DE",
  // USA
  us: "US", usa: "US", american: "US",
  // UK
  gb: "GB", uk: "GB", british: "GB", eng: "GB", england: "GB",
  // France
  fr: "FR", french: "FR", fra: "FR",
  // Spain
  es: "ES", spanish: "ES", esp: "ES", spain: "ES",
  // Italy
  it: "IT", italian: "IT", ita: "IT", italy: "IT",
  // Poland
  pl: "PL", polish: "PL", pol: "PL", poland: "PL",
  // Slovakia
  sk: "SK", slovak: "SK", svk: "SK", slovakia: "SK",
  // Austria
  at: "AT", austrian: "AT", aut: "AT", austria: "AT",
  // Netherlands
  nl: "NL", dutch: "NL", nld: "NL", netherlands: "NL",
  // Belgium
  be: "BE", belgian: "BE", bel: "BE", belgium: "BE",
  // Switzerland
  ch: "CH", swiss: "CH", che: "CH", switzerland: "CH",
  // Russia
  ru: "RU", russian: "RU", rus: "RU", russia: "RU",
  // Ukraine
  ua: "UA", ukrainian: "UA", ukr: "UA", ukraine: "UA",
  // China
  cn: "CN", chinese: "CN", chn: "CN", china: "CN",
  // Japan
  jp: "JP", japanese: "JP", jpn: "JP", japan: "JP",
  // Korea
  kr: "KR", korean: "KR", kor: "KR", korea: "KR",
  // Australia
  au: "AU", australian: "AU", aus: "AU", australia: "AU",
  // Canada
  ca: "CA", canadian: "CA", can: "CA", canada: "CA",
  // Brazil
  br: "BR", brazilian: "BR", bra: "BR", brazil: "BR",
  // Mexico
  mx: "MX", mexican: "MX", mex: "MX", mexico: "MX",
  // India
  in: "IN", indian: "IN", ind: "IN", india: "IN",
  // Sweden
  se: "SE", swedish: "SE", swe: "SE", sweden: "SE",
  // Norway
  no: "NO", norwegian: "NO", nor: "NO", norway: "NO",
  // Denmark
  dk: "DK", danish: "DK", dnk: "DK", denmark: "DK",
  // Finland
  fi: "FI", finnish: "FI", fin: "FI", finland: "FI",
  // Portugal
  pt: "PT", portuguese: "PT", prt: "PT", portugal: "PT",
  // Greece
  gr: "GR", greek: "GR", grc: "GR", greece: "GR",
  // Hungary
  hu: "HU", hungarian: "HU", hun: "HU", hungary: "HU",
  // Romania
  ro: "RO", romanian: "RO", rou: "RO", romania: "RO",
  // Bulgaria
  bg: "BG", bulgarian: "BG", bgr: "BG", bulgaria: "BG",
  // Croatia
  hr: "HR", croatian: "HR", hrv: "HR", croatia: "HR",
  // Slovenia
  si: "SI", slovenian: "SI", svn: "SI", slovenia: "SI",
  // Serbia
  rs: "RS", serbian: "RS", srb: "RS", serbia: "RS",
  // Ireland
  ie: "IE", irish: "IE", irl: "IE", ireland: "IE",
  // Israel
  il: "IL", israeli: "IL", isr: "IL", israel: "IL",
  // Turkey
  tr: "TR", turkish: "TR", tur: "TR", turkey: "TR",
  // South Africa
  za: "ZA", "south african": "ZA", zaf: "ZA",
  // Argentina
  ar: "AR", argentine: "AR", arg: "AR", argentina: "AR",
  // Chile
  cl: "CL", chilean: "CL", chl: "CL", chile: "CL",
  // New Zealand
  nz: "NZ", "new zealand": "NZ", nzl: "NZ",
  // Singapore
  sg: "SG", singaporean: "SG", sgp: "SG", singapore: "SG",
  // Thailand
  th: "TH", thai: "TH", tha: "TH", thailand: "TH",
  // Malaysia
  my: "MY", malaysian: "MY", mys: "MY", malaysia: "MY",
  // Indonesia
  id: "ID", indonesian: "ID", idn: "ID", indonesia: "ID",
  // Philippines
  ph: "PH", filipino: "PH", phl: "PH", philippines: "PH",
  // Vietnam
  vn: "VN", vietnamese: "VN", vnm: "VN", vietnam: "VN",
  // Egypt
  eg: "EG", egyptian: "EG", egy: "EG", egypt: "EG",
  // UAE
  ae: "AE", emirati: "AE", are: "AE", uae: "AE",
  // Saudi Arabia
  sa: "SA", saudi: "SA", sau: "SA",
};

/**
 * Convert a nationality string to ISO country code
 */
export function getIsoCode(nationality: string): string | null {
  const normalized = nationality.toLowerCase().trim();
  return NATIONALITY_TO_ISO[normalized] || null;
}

/**
 * Get display name for a nationality code
 */
export function getNationalityDisplayName(code: string): string {
  const displayNames: Record<string, string> = {
    CZ: "Česká republika",
    DE: "Německo",
    US: "USA",
    GB: "Velká Británie",
    FR: "Francie",
    ES: "Španělsko",
    IT: "Itálie",
    PL: "Polsko",
    SK: "Slovensko",
    AT: "Rakousko",
    NL: "Nizozemsko",
    BE: "Belgie",
    CH: "Švýcarsko",
    RU: "Rusko",
    UA: "Ukrajina",
    CN: "Čína",
    JP: "Japonsko",
    KR: "Jižní Korea",
    AU: "Austrálie",
    CA: "Kanada",
    BR: "Brazílie",
    MX: "Mexiko",
    IN: "Indie",
    SE: "Švédsko",
    NO: "Norsko",
    DK: "Dánsko",
    FI: "Finsko",
    PT: "Portugalsko",
    GR: "Řecko",
    HU: "Maďarsko",
    RO: "Rumunsko",
    BG: "Bulharsko",
    HR: "Chorvatsko",
    SI: "Slovinsko",
    RS: "Srbsko",
    IE: "Irsko",
    IL: "Izrael",
    TR: "Turecko",
    ZA: "Jižní Afrika",
    AR: "Argentina",
    CL: "Chile",
    NZ: "Nový Zéland",
    SG: "Singapur",
    TH: "Thajsko",
    MY: "Malajsie",
    ID: "Indonésie",
    PH: "Filipíny",
    VN: "Vietnam",
    EG: "Egypt",
    AE: "SAE",
    SA: "Saúdská Arábie",
  };
  return displayNames[code] || code;
}
