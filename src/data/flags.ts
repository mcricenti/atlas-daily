/** ISO 3166 two-letter codes, used to show each country's flag (public/flags/<code>.svg). */
export const ISO2: Record<string, string> = {
  'na-canada': 'ca', 'na-usa': 'us', 'na-mexico': 'mx', 'na-guatemala': 'gt', 'na-belize': 'bz',
  'na-honduras': 'hn', 'na-el-salvador': 'sv', 'na-nicaragua': 'ni', 'na-costa-rica': 'cr',
  'na-panama': 'pa', 'na-cuba': 'cu', 'na-jamaica': 'jm', 'na-haiti': 'ht', 'na-dr': 'do',
  'sa-colombia': 'co', 'sa-venezuela': 've', 'sa-guyana': 'gy', 'sa-suriname': 'sr', 'sa-ecuador': 'ec',
  'sa-peru': 'pe', 'sa-brazil': 'br', 'sa-bolivia': 'bo', 'sa-paraguay': 'py', 'sa-chile': 'cl',
  'sa-argentina': 'ar', 'sa-uruguay': 'uy',
  'eu-uk': 'gb', 'eu-ireland': 'ie', 'eu-france': 'fr', 'eu-spain': 'es', 'eu-portugal': 'pt',
  'eu-germany': 'de', 'eu-italy': 'it', 'eu-switzerland': 'ch', 'eu-austria': 'at', 'eu-netherlands': 'nl',
  'eu-belgium': 'be', 'eu-poland': 'pl', 'eu-sweden': 'se', 'eu-norway': 'no', 'eu-finland': 'fi',
  'eu-greece': 'gr', 'eu-ukraine': 'ua', 'eu-russia': 'ru',
  'af-egypt': 'eg', 'af-morocco': 'ma', 'af-algeria': 'dz', 'af-nigeria': 'ng', 'af-ghana': 'gh',
  'af-ethiopia': 'et', 'af-kenya': 'ke', 'af-tanzania': 'tz', 'af-south-africa': 'za', 'af-dr-congo': 'cd',
  'af-sudan': 'sd', 'af-libya': 'ly', 'af-tunisia': 'tn', 'af-madagascar': 'mg',
  'as-china': 'cn', 'as-japan': 'jp', 'as-india': 'in', 'as-south-korea': 'kr', 'as-north-korea': 'kp',
  'as-indonesia': 'id', 'as-thailand': 'th', 'as-vietnam': 'vn', 'as-philippines': 'ph', 'as-malaysia': 'my',
  'as-singapore': 'sg', 'as-pakistan': 'pk', 'as-bangladesh': 'bd', 'as-afghanistan': 'af', 'as-iran': 'ir',
  'as-iraq': 'iq', 'as-saudi': 'sa', 'as-turkey': 'tr', 'as-israel': 'il', 'as-uae': 'ae',
  'as-kazakhstan': 'kz', 'as-mongolia': 'mn', 'as-nepal': 'np', 'as-myanmar': 'mm', 'as-sri-lanka': 'lk',
  'wr-australia': 'au', 'wr-new-zealand': 'nz', 'wr-papua': 'pg', 'wr-fiji': 'fj', 'wr-samoa': 'ws',
  'wr-tonga': 'to', 'wr-solomon': 'sb', 'wr-vanuatu': 'vu', 'wr-micronesia': 'fm', 'wr-palau': 'pw',
  'wr-marshall': 'mh', 'wr-kiribati': 'ki', 'wr-nauru': 'nr', 'wr-tuvalu': 'tv', 'wr-iceland': 'is',
  'wr-greenland': 'gl', 'wr-trinidad': 'tt', 'wr-bahamas': 'bs', 'wr-barbados': 'bb', 'wr-malta': 'mt',
  'wr-cyprus': 'cy', 'wr-georgia': 'ge', 'wr-armenia': 'am', 'wr-azerbaijan': 'az',
}

export function flagUrl(factId: string): string | null {
  const code = ISO2[factId]
  return code ? `${import.meta.env.BASE_URL}flags/${code}.svg` : null
}
