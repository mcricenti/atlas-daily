/**
 * Real-world coordinates for every non-state fact.
 *
 * - Countries: `at` is the capital city ([longitude, latitude]).
 * - Everything else: `at` is a good "pointing spot" for the place.
 * - `box` is the camera frame for places that are regions rather than
 *   points: [west, north, east, south] in degrees.
 * - `line` is a simplified course (rivers, walls, reefs) drawn on the map.
 * - `center` re-centres the world map on that longitude so Pacific places
 *   are not split across the left and right edges.
 */
export type WorldPlace = {
  at: [number, number]
  box?: [number, number, number, number]
  line?: [number, number][]
  center?: number
}

export const WORLD_PLACES: Record<string, WorldPlace> = {
  // North America
  'na-canada': { at: [-75.7, 45.42] },
  'na-usa': { at: [-77.04, 38.9] },
  'na-mexico': { at: [-99.13, 19.43] },
  'na-guatemala': { at: [-90.51, 14.63] },
  'na-belize': { at: [-88.77, 17.25] },
  'na-honduras': { at: [-87.21, 14.07] },
  'na-el-salvador': { at: [-89.19, 13.69] },
  'na-nicaragua': { at: [-86.25, 12.13] },
  'na-costa-rica': { at: [-84.09, 9.93] },
  'na-panama': { at: [-79.52, 8.98] },
  'na-cuba': { at: [-82.37, 23.11] },
  'na-jamaica': { at: [-76.79, 18.0] },
  'na-haiti': { at: [-72.34, 18.54] },
  'na-dr': { at: [-69.93, 18.47] },

  // South America
  'sa-colombia': { at: [-74.07, 4.71] },
  'sa-venezuela': { at: [-66.9, 10.49] },
  'sa-guyana': { at: [-58.16, 6.8] },
  'sa-suriname': { at: [-55.2, 5.85] },
  'sa-ecuador': { at: [-78.47, -0.18] },
  'sa-peru': { at: [-77.04, -12.05] },
  'sa-brazil': { at: [-47.88, -15.79] },
  'sa-bolivia': { at: [-65.26, -19.04] },
  'sa-paraguay': { at: [-57.58, -25.26] },
  'sa-chile': { at: [-70.67, -33.45] },
  'sa-argentina': { at: [-58.38, -34.6] },
  'sa-uruguay': { at: [-56.16, -34.9] },

  // Europe
  'eu-uk': { at: [-0.13, 51.51] },
  'eu-ireland': { at: [-6.26, 53.35] },
  'eu-france': { at: [2.35, 48.86] },
  'eu-spain': { at: [-3.7, 40.42] },
  'eu-portugal': { at: [-9.14, 38.72] },
  'eu-germany': { at: [13.4, 52.52] },
  'eu-italy': { at: [12.5, 41.9] },
  'eu-switzerland': { at: [7.45, 46.95] },
  'eu-austria': { at: [16.37, 48.21] },
  'eu-netherlands': { at: [4.9, 52.37] },
  'eu-belgium': { at: [4.35, 50.85] },
  'eu-poland': { at: [21.01, 52.23] },
  'eu-sweden': { at: [18.07, 59.33] },
  'eu-norway': { at: [10.75, 59.91] },
  'eu-finland': { at: [24.94, 60.17] },
  'eu-greece': { at: [23.73, 37.98] },
  'eu-ukraine': { at: [30.52, 50.45] },
  'eu-russia': { at: [37.62, 55.75] },

  // Africa
  'af-egypt': { at: [31.24, 30.04] },
  'af-morocco': { at: [-6.84, 34.02] },
  'af-algeria': { at: [3.06, 36.75] },
  'af-nigeria': { at: [7.49, 9.06] },
  'af-ghana': { at: [-0.19, 5.6] },
  'af-ethiopia': { at: [38.75, 9.03] },
  'af-kenya': { at: [36.82, -1.29] },
  'af-tanzania': { at: [35.74, -6.16] },
  'af-south-africa': { at: [28.19, -25.75] },
  'af-dr-congo': { at: [15.31, -4.32] },
  'af-sudan': { at: [32.56, 15.5] },
  'af-libya': { at: [13.19, 32.89] },
  'af-tunisia': { at: [10.18, 36.81] },
  'af-madagascar': { at: [47.51, -18.88] },

  // Asia
  'as-china': { at: [116.4, 39.9] },
  'as-japan': { at: [139.69, 35.69] },
  'as-india': { at: [77.21, 28.61] },
  'as-south-korea': { at: [126.98, 37.57] },
  'as-north-korea': { at: [125.75, 39.03] },
  'as-indonesia': { at: [106.85, -6.21] },
  'as-thailand': { at: [100.5, 13.76] },
  'as-vietnam': { at: [105.83, 21.03] },
  'as-philippines': { at: [120.98, 14.6] },
  'as-malaysia': { at: [101.69, 3.14] },
  'as-singapore': { at: [103.82, 1.35] },
  'as-pakistan': { at: [73.05, 33.68] },
  'as-bangladesh': { at: [90.41, 23.81] },
  'as-afghanistan': { at: [69.17, 34.53] },
  'as-iran': { at: [51.39, 35.69] },
  'as-iraq': { at: [44.36, 33.31] },
  'as-saudi': { at: [46.72, 24.71] },
  'as-turkey': { at: [32.86, 39.93] },
  'as-israel': { at: [35.21, 31.77] },
  'as-uae': { at: [54.37, 24.45] },
  'as-kazakhstan': { at: [71.43, 51.17] },
  'as-mongolia': { at: [106.92, 47.89] },
  'as-nepal': { at: [85.32, 27.72] },
  'as-myanmar': { at: [96.13, 19.76] },
  'as-sri-lanka': { at: [79.86, 6.93] },

  // Oceania & beyond
  'wr-australia': { at: [149.13, -35.28], center: 150 },
  'wr-new-zealand': { at: [174.78, -41.29], center: 150 },
  'wr-papua': { at: [147.18, -9.44], center: 150 },
  'wr-fiji': { at: [178.44, -18.14], center: 170 },
  'wr-samoa': { at: [-171.77, -13.83], center: 170 },
  'wr-tonga': { at: [-175.2, -21.14], center: 170 },
  'wr-solomon': { at: [159.95, -9.43], center: 150 },
  'wr-vanuatu': { at: [168.32, -17.73], center: 150 },
  'wr-micronesia': { at: [158.16, 6.92], center: 150 },
  'wr-palau': { at: [134.62, 7.5], center: 150 },
  'wr-marshall': { at: [171.38, 7.09], center: 150 },
  'wr-kiribati': { at: [173.0, 1.45], center: 170 },
  'wr-nauru': { at: [166.92, -0.55], center: 150 },
  'wr-tuvalu': { at: [179.2, -8.52], center: 170 },
  'wr-iceland': { at: [-21.94, 64.15] },
  'wr-greenland': { at: [-51.74, 64.18] },
  'wr-trinidad': { at: [-61.52, 10.66] },
  'wr-bahamas': { at: [-77.34, 25.05] },
  'wr-barbados': { at: [-59.61, 13.1] },
  'wr-malta': { at: [14.51, 35.9] },
  'wr-cyprus': { at: [33.37, 35.17] },
  'wr-georgia': { at: [44.8, 41.72] },
  'wr-armenia': { at: [44.51, 40.18] },
  'wr-azerbaijan': { at: [49.87, 40.41] },

  // Continents
  'cont-na': { at: [-100, 45], box: [-170, 78, -50, 5] },
  'cont-sa': { at: [-58, -15], box: [-98, 16, -22, -58] },
  'cont-eu': { at: [15, 52], box: [-28, 73, 64, 33] },
  'cont-af': { at: [20, 5], box: [-40, 40, 72, -38] },
  'cont-as': { at: [90, 45], box: [22, 80, 180, -14] },
  'cont-au': { at: [134, -25], box: [100, -4, 180, -50] },
  'cont-an': { at: [0, -80], box: [-180, -40, 180, -90] },

  // Oceans
  'ocean-pacific': { at: [-150, 5], box: [118, 62, -72, -62], center: -160 },
  'ocean-atlantic': { at: [-38, 28], box: [-85, 66, 22, -56] },
  'ocean-indian': { at: [78, -22], box: [28, 28, 122, -56] },
  'ocean-southern': { at: [20, -62], box: [-180, -35, 180, -90] },
  'ocean-arctic': { at: [0, 84], box: [-180, 90, 180, 55] },

  // Rivers (simplified courses, source → mouth)
  'river-mississippi': {
    at: [-90.05, 35.15],
    box: [-106, 50, -76, 26],
    line: [
      [-95.2, 47.2], [-93.3, 44.98], [-91.2, 43.0], [-90.2, 38.6],
      [-89.2, 37.0], [-90.05, 35.15], [-90.9, 32.35], [-91.2, 30.45],
      [-90.07, 29.95], [-89.25, 29.15],
    ],
  },
  'river-missouri': {
    at: [-100.35, 44.37],
    box: [-118, 51, -86, 35],
    line: [
      [-111.5, 45.9], [-111.3, 47.5], [-106.4, 48.0], [-103.6, 48.1],
      [-100.8, 46.8], [-100.35, 44.37], [-96.4, 42.5], [-95.93, 41.26],
      [-94.58, 39.1], [-90.2, 38.75],
    ],
  },
  'river-amazon': {
    at: [-60.0, -3.1],
    box: [-84, 10, -42, -20],
    line: [
      [-73.6, -4.5], [-73.25, -3.75], [-69.95, -4.2], [-64.7, -3.35],
      [-60.0, -3.1], [-54.7, -2.45], [-51.05, 0.0], [-49.5, 0.5],
    ],
  },
  'river-nile': {
    at: [32.9, 24.1],
    box: [12, 35, 52, -5],
    line: [
      [33.2, 0.4], [31.6, 4.85], [31.65, 9.5], [32.5, 15.6], [34.0, 17.7],
      [33.3, 19.5], [30.5, 19.2], [31.3, 21.8], [32.9, 24.1], [32.65, 25.7],
      [31.2, 27.2], [31.25, 30.05], [31.0, 31.5],
    ],
  },
  'river-congo': {
    at: [18.3, 0.05],
    box: [2, 10, 38, -14],
    line: [
      [25.9, -9.2], [25.9, -2.95], [25.2, 0.5], [22.5, 2.2], [18.3, 0.05],
      [15.3, -4.3], [13.45, -5.8], [12.4, -6.05],
    ],
  },
  'river-yangtze': {
    at: [111.3, 30.7],
    box: [86, 42, 128, 20],
    line: [
      [91.0, 33.5], [97.0, 33.0], [99.5, 28.0], [99.9, 26.9], [101.7, 26.6],
      [104.6, 28.8], [106.55, 29.56], [111.3, 30.7], [114.3, 30.6],
      [118.8, 32.05], [121.8, 31.4],
    ],
  },
  'river-ganges': {
    at: [83.0, 25.3],
    box: [68, 34, 98, 16],
    line: [
      [79.0, 30.9], [78.15, 29.95], [80.35, 26.45], [81.85, 25.45],
      [83.0, 25.3], [85.15, 25.6], [87.9, 24.8], [90.5, 23.2], [90.8, 22.3],
    ],
  },
  'river-danube': {
    at: [19.05, 47.5],
    box: [2, 55, 36, 38],
    line: [
      [8.5, 47.95], [12.1, 49.0], [16.37, 48.2], [19.05, 47.5], [18.9, 45.8],
      [20.45, 44.8], [22.5, 44.6], [25.5, 43.7], [28.0, 45.3], [29.7, 45.2],
    ],
  },
  'river-rhine': {
    at: [7.6, 50.36],
    box: [-6, 57, 20, 42],
    line: [
      [8.7, 46.65], [9.5, 47.55], [7.6, 47.56], [7.8, 48.57], [8.27, 50.0],
      [7.6, 50.36], [6.96, 50.94], [6.1, 51.85], [4.1, 51.95],
    ],
  },
  'river-volga': {
    at: [46.0, 51.55],
    box: [24, 62, 66, 41],
    line: [
      [32.5, 57.25], [35.9, 56.85], [39.9, 57.6], [44.0, 56.3], [49.1, 55.8],
      [50.1, 53.2], [46.0, 51.55], [44.5, 48.7], [48.05, 46.35], [48.5, 45.7],
    ],
  },

  // Mountains
  'mt-everest': { at: [86.93, 27.99], box: [66, 40, 106, 16] },
  'mt-kilimanjaro': { at: [37.36, -3.07], box: [18, 10, 56, -16] },
  'mt-denali': { at: [-151.0, 63.07], box: [-178, 75, -122, 48] },
  'mt-aconcagua': { at: [-70.01, -32.65], box: [-90, -20, -50, -46] },
  'mt-elbrus': { at: [42.44, 43.35], box: [22, 56, 62, 32] },
  'mt-fuji': { at: [138.73, 35.36], box: [122, 46, 154, 26] },
  'mt-matterhorn': { at: [7.66, 45.98], box: [-6, 54, 22, 38] },
  'mt-rainier': { at: [-121.76, 46.85], box: [-138, 56, -106, 37] },

  // Landmarks
  'lm-grand-canyon': { at: [-112.1, 36.1], box: [-128, 46, -96, 27] },
  'lm-great-barrier': {
    at: [147.7, -18.3],
    box: [124, -4, 170, -34],
    center: 150,
    line: [[143.5, -11.0], [145.5, -15.0], [147.0, -18.5], [150.5, -21.5], [152.5, -24.0]],
  },
  'lm-sahara': { at: [13, 23], box: [-22, 40, 42, 6] },
  'lm-amazon-rainforest': { at: [-62, -5], box: [-86, 12, -40, -22] },
  'lm-great-wall': {
    at: [116.0, 40.35],
    box: [90, 50, 130, 28],
    line: [[98.2, 39.8], [104.0, 38.0], [109.0, 38.3], [113.0, 40.0], [116.0, 40.35], [119.75, 40.0]],
  },
  'lm-niagara': { at: [-79.07, 43.08], box: [-94, 51, -64, 35] },
  'lm-uluru': { at: [131.04, -25.34], box: [110, -8, 158, -42], center: 150 },
}

/** Continent for each country name in the world map file. */
const CONTINENT_LISTS: Record<string, string> = {
  'North America':
    'Canada|United States of America|Mexico|Greenland|Guatemala|Belize|Honduras|El Salvador|Nicaragua|Costa Rica|Panama|Cuba|Jamaica|Haiti|Dominican Rep.|Bahamas|Puerto Rico|Trinidad and Tobago|Bermuda|Cayman Is.|Turks and Caicos Is.|British Virgin Is.|U.S. Virgin Is.|Anguilla|Montserrat|Antigua and Barb.|St. Kitts and Nevis|Dominica|Saint Lucia|St. Vin. and Gren.|Grenada|Barbados|Aruba|Curaçao|Sint Maarten|St-Martin|St-Barthélemy|St. Pierre and Miquelon',
  'South America':
    'Colombia|Venezuela|Guyana|Suriname|Ecuador|Peru|Brazil|Bolivia|Paraguay|Chile|Argentina|Uruguay|Falkland Is.',
  Europe:
    'Norway|Sweden|Finland|Iceland|Denmark|United Kingdom|Ireland|France|Spain|Portugal|Germany|Italy|Switzerland|Austria|Netherlands|Belgium|Luxembourg|Poland|Czechia|Slovakia|Hungary|Romania|Bulgaria|Greece|Albania|Croatia|Slovenia|Bosnia and Herz.|Macedonia|Serbia|Montenegro|Kosovo|Moldova|Ukraine|Belarus|Lithuania|Latvia|Estonia|Vatican|San Marino|Monaco|Malta|Liechtenstein|Andorra|Jersey|Guernsey|Isle of Man|Åland|Faeroe Is.',
  Africa:
    "Tanzania|W. Sahara|Dem. Rep. Congo|Somalia|Kenya|Sudan|Chad|South Africa|Lesotho|Zimbabwe|Botswana|Namibia|Senegal|Mali|Mauritania|Benin|Niger|Nigeria|Cameroon|Togo|Ghana|Côte d'Ivoire|Guinea|Guinea-Bissau|Liberia|Sierra Leone|Burkina Faso|Central African Rep.|Congo|Gabon|Eq. Guinea|Zambia|Malawi|Mozambique|eSwatini|Angola|Burundi|Madagascar|Gambia|Tunisia|Algeria|Eritrea|Morocco|Egypt|Libya|Ethiopia|Djibouti|Somaliland|Uganda|Rwanda|S. Sudan|Seychelles|São Tomé and Principe|Mauritius|Comoros|Cabo Verde|Saint Helena",
  Asia:
    'Kazakhstan|Uzbekistan|Indonesia|Timor-Leste|Israel|Lebanon|Palestine|Jordan|United Arab Emirates|Qatar|Kuwait|Iraq|Oman|Cambodia|Thailand|Laos|Myanmar|Vietnam|North Korea|South Korea|Mongolia|India|Bangladesh|Bhutan|Nepal|Pakistan|Afghanistan|Tajikistan|Kyrgyzstan|Turkmenistan|Iran|Syria|Armenia|Turkey|Sri Lanka|China|Taiwan|Azerbaijan|Georgia|Philippines|Malaysia|Brunei|Japan|Yemen|Saudi Arabia|N. Cyprus|Cyprus|Singapore|Maldives|Macao|Hong Kong|Bahrain|Siachen Glacier',
  Australia: 'Australia',
  Antarctica: 'Antarctica',
}

/** Russia spans two continents; the map splits it at the Ural Mountains. */
export const RUSSIA_SPLIT_LON = 60

export const CONTINENT_OF: Record<string, string> = Object.fromEntries(
  Object.entries(CONTINENT_LISTS).flatMap(([continent, names]) =>
    names.split('|').map((n) => [n, continent]),
  ),
)
