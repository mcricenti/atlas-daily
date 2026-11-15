import type { GeoFact } from './curriculum-types'
import { state } from './curriculum-types'

/** Populations: U.S. Census Bureau July 1, 2023 estimates (rounded). */
export const FACTS_US: GeoFact[] = [
  // Northeast
  state('ME', 'Maine', 'Augusta', 'us-northeast', 'Northeastern tip of the U.S., famous for lobsters and rocky coast.', { x: 92, y: 18 }, ['New Hampshire'], 1_395_722),
  state('NH', 'New Hampshire', 'Concord', 'us-northeast', 'Small New England state between Maine and Vermont.', { x: 88, y: 22 }, ['Maine', 'Vermont', 'Massachusetts'], 1_402_054),
  state('VT', 'Vermont', 'Montpelier', 'us-northeast', 'Green Mountain state on Canada’s border.', { x: 84, y: 20 }, ['New Hampshire', 'New York', 'Massachusetts'], 647_464),
  state('MA', 'Massachusetts', 'Boston', 'us-northeast', 'Home of the Boston Tea Party and Cape Cod.', { x: 90, y: 28 }, ['New Hampshire', 'Vermont', 'New York', 'Connecticut', 'Rhode Island'], 7_001_399),
  state('RI', 'Rhode Island', 'Providence', 'us-northeast', 'The smallest U.S. state.', { x: 92, y: 32 }, ['Massachusetts', 'Connecticut'], 1_095_962),
  state('CT', 'Connecticut', 'Hartford', 'us-northeast', 'Between New York and Rhode Island on Long Island Sound.', { x: 88, y: 34 }, ['New York', 'Massachusetts', 'Rhode Island'], 3_617_176),
  state('NY', 'New York', 'Albany', 'us-northeast', 'Empire State — Niagara Falls and New York City.', { x: 80, y: 28 }, ['Pennsylvania', 'New Jersey', 'Connecticut', 'Massachusetts', 'Vermont'], 19_571_216),
  state('NJ', 'New Jersey', 'Trenton', 'us-northeast', 'Between New York City and Philadelphia.', { x: 84, y: 38 }, ['New York', 'Pennsylvania', 'Delaware'], 9_290_841),
  state('PA', 'Pennsylvania', 'Harrisburg', 'us-northeast', 'Keystone State — Philadelphia and Pittsburgh.', { x: 76, y: 36 }, ['New York', 'New Jersey', 'Delaware', 'Maryland', 'West Virginia', 'Ohio'], 12_961_683),
  state('DE', 'Delaware', 'Dover', 'us-northeast', 'First state to ratify the Constitution.', { x: 82, y: 42 }, ['Maryland', 'New Jersey', 'Pennsylvania'], 1_031_890),
  state('MD', 'Maryland', 'Annapolis', 'us-northeast', 'Wraps around Chesapeake Bay.', { x: 78, y: 44 }, ['Pennsylvania', 'Delaware', 'Virginia', 'West Virginia'], 6_180_253),

  // Southeast
  state('VA', 'Virginia', 'Richmond', 'us-southeast', 'Home to Colonial Williamsburg and the Blue Ridge.', { x: 76, y: 48 }, ['Maryland', 'West Virginia', 'Kentucky', 'Tennessee', 'North Carolina'], 8_715_698),
  state('WV', 'West Virginia', 'Charleston', 'us-southeast', 'Mountain state carved from Virginia.', { x: 72, y: 44 }, ['Pennsylvania', 'Maryland', 'Virginia', 'Kentucky', 'Ohio'], 1_770_071),
  state('NC', 'North Carolina', 'Raleigh', 'us-southeast', 'Outer Banks and Great Smoky Mountains.', { x: 78, y: 54 }, ['Virginia', 'Tennessee', 'South Carolina', 'Georgia'], 10_835_491),
  state('SC', 'South Carolina', 'Columbia', 'us-southeast', 'Palmetto State on the Atlantic.', { x: 76, y: 60 }, ['North Carolina', 'Georgia'], 5_373_555),
  state('GA', 'Georgia', 'Atlanta', 'us-southeast', 'Peach State — Atlanta is a major hub.', { x: 72, y: 64 }, ['South Carolina', 'North Carolina', 'Tennessee', 'Alabama', 'Florida'], 11_029_227),
  state('FL', 'Florida', 'Tallahassee', 'us-southeast', 'Peninsula pointing into the Caribbean.', { x: 74, y: 78 }, ['Georgia', 'Alabama'], 22_610_726),
  state('AL', 'Alabama', 'Montgomery', 'us-southeast', 'Heart of Dixie between Mississippi and Georgia.', { x: 66, y: 66 }, ['Mississippi', 'Tennessee', 'Georgia', 'Florida'], 5_108_468),
  state('MS', 'Mississippi', 'Jackson', 'us-southeast', 'Named for the mighty Mississippi River.', { x: 60, y: 66 }, ['Louisiana', 'Arkansas', 'Tennessee', 'Alabama'], 2_939_690),
  state('LA', 'Louisiana', 'Baton Rouge', 'us-southeast', 'Mississippi River delta and New Orleans.', { x: 56, y: 72 }, ['Texas', 'Arkansas', 'Mississippi'], 4_573_749),
  state('AR', 'Arkansas', 'Little Rock', 'us-southeast', 'Natural State between Missouri and Louisiana.', { x: 56, y: 60 }, ['Missouri', 'Tennessee', 'Mississippi', 'Louisiana', 'Texas', 'Oklahoma'], 3_067_732),
  state('TN', 'Tennessee', 'Nashville', 'us-southeast', 'Long east–west state — Music City.', { x: 64, y: 56 }, ['Kentucky', 'Virginia', 'North Carolina', 'Georgia', 'Alabama', 'Mississippi', 'Arkansas', 'Missouri'], 7_126_489),
  state('KY', 'Kentucky', 'Frankfort', 'us-southeast', 'Bluegrass State north of Tennessee.', { x: 66, y: 50 }, ['Indiana', 'Ohio', 'West Virginia', 'Virginia', 'Tennessee', 'Missouri', 'Illinois'], 4_526_154),

  // Midwest
  state('OH', 'Ohio', 'Columbus', 'us-midwest', 'Buckeye State on Lake Erie.', { x: 70, y: 40 }, ['Pennsylvania', 'West Virginia', 'Kentucky', 'Indiana', 'Michigan'], 11_785_935),
  state('MI', 'Michigan', 'Lansing', 'us-midwest', 'Shaped like a mitten, surrounded by Great Lakes.', { x: 66, y: 28 }, ['Ohio', 'Indiana', 'Wisconsin'], 10_037_261),
  state('IN', 'Indiana', 'Indianapolis', 'us-midwest', 'Hoosier State between Ohio and Illinois.', { x: 64, y: 42 }, ['Michigan', 'Ohio', 'Kentucky', 'Illinois'], 6_862_199),
  state('IL', 'Illinois', 'Springfield', 'us-midwest', 'Lincoln’s state — Chicago on Lake Michigan.', { x: 58, y: 42 }, ['Wisconsin', 'Indiana', 'Kentucky', 'Missouri', 'Iowa'], 12_549_689),
  state('WI', 'Wisconsin', 'Madison', 'us-midwest', 'Dairy State north of Illinois.', { x: 56, y: 28 }, ['Michigan', 'Illinois', 'Iowa', 'Minnesota'], 5_910_955),
  state('MN', 'Minnesota', 'Saint Paul', 'us-midwest', 'Land of 10,000 Lakes — Twin Cities.', { x: 50, y: 22 }, ['Wisconsin', 'Iowa', 'South Dakota', 'North Dakota'], 5_737_915),
  state('IA', 'Iowa', 'Des Moines', 'us-midwest', 'Corn Belt state between Missouri rivers.', { x: 52, y: 38 }, ['Minnesota', 'Wisconsin', 'Illinois', 'Missouri', 'Nebraska', 'South Dakota'], 3_207_004),
  state('MO', 'Missouri', 'Jefferson City', 'us-midwest', 'Gateway Arch in St. Louis.', { x: 54, y: 48 }, ['Iowa', 'Illinois', 'Kentucky', 'Tennessee', 'Arkansas', 'Oklahoma', 'Kansas', 'Nebraska'], 6_196_156),
  state('ND', 'North Dakota', 'Bismarck', 'us-midwest', 'Northern plains on Canada’s border.', { x: 42, y: 18 }, ['Minnesota', 'South Dakota', 'Montana'], 783_926),
  state('SD', 'South Dakota', 'Pierre', 'us-midwest', 'Home of Mount Rushmore.', { x: 42, y: 30 }, ['North Dakota', 'Minnesota', 'Iowa', 'Nebraska', 'Wyoming', 'Montana'], 919_318),
  state('NE', 'Nebraska', 'Lincoln', 'us-midwest', 'Cornhusker State across the Great Plains.', { x: 44, y: 40 }, ['South Dakota', 'Iowa', 'Missouri', 'Kansas', 'Colorado', 'Wyoming'], 1_978_379),
  state('KS', 'Kansas', 'Topeka', 'us-midwest', 'Sunflower State in the center of the Lower 48.', { x: 46, y: 50 }, ['Nebraska', 'Missouri', 'Oklahoma', 'Colorado'], 2_940_546),

  // Southwest
  state('OK', 'Oklahoma', 'Oklahoma City', 'us-southwest', 'Panhandle state north of Texas.', { x: 48, y: 58 }, ['Kansas', 'Missouri', 'Arkansas', 'Texas', 'New Mexico', 'Colorado'], 4_053_824),
  state('TX', 'Texas', 'Austin', 'us-southwest', 'Largest state in the Lower 48.', { x: 44, y: 70 }, ['New Mexico', 'Oklahoma', 'Arkansas', 'Louisiana'], 30_503_301),
  state('NM', 'New Mexico', 'Santa Fe', 'us-southwest', 'Land of Enchantment — high desert and pueblos.', { x: 34, y: 62 }, ['Arizona', 'Colorado', 'Oklahoma', 'Texas', 'Utah'], 2_114_371),
  state('AZ', 'Arizona', 'Phoenix', 'us-southwest', 'Grand Canyon State.', { x: 26, y: 62 }, ['California', 'Nevada', 'Utah', 'New Mexico'], 7_431_344),
  state('NV', 'Nevada', 'Carson City', 'us-southwest', 'Silver State — Las Vegas and the Sierra edge.', { x: 18, y: 48 }, ['Oregon', 'Idaho', 'Utah', 'Arizona', 'California'], 3_194_176),
  state('UT', 'Utah', 'Salt Lake City', 'us-southwest', 'Great Salt Lake and red-rock parks.', { x: 28, y: 48 }, ['Idaho', 'Wyoming', 'Colorado', 'Arizona', 'Nevada'], 3_417_734),
  state('CO', 'Colorado', 'Denver', 'us-southwest', 'Rocky Mountain State — Mile High City.', { x: 36, y: 48 }, ['Wyoming', 'Nebraska', 'Kansas', 'Oklahoma', 'New Mexico', 'Utah'], 5_877_610),

  // West
  state('WY', 'Wyoming', 'Cheyenne', 'us-west', 'Least populated state — Yellowstone.', { x: 34, y: 36 }, ['Montana', 'South Dakota', 'Nebraska', 'Colorado', 'Utah', 'Idaho'], 584_057),
  state('MT', 'Montana', 'Helena', 'us-west', 'Big Sky Country on Canada’s border.', { x: 32, y: 20 }, ['Idaho', 'North Dakota', 'South Dakota', 'Wyoming'], 1_132_812),
  state('ID', 'Idaho', 'Boise', 'us-west', 'Potato State with a distinctive panhandle.', { x: 24, y: 28 }, ['Washington', 'Montana', 'Wyoming', 'Utah', 'Nevada', 'Oregon'], 1_964_726),
  state('WA', 'Washington', 'Olympia', 'us-west', 'Pacific Northwest — Seattle and rain forests.', { x: 14, y: 14 }, ['Oregon', 'Idaho'], 7_812_880),
  state('OR', 'Oregon', 'Salem', 'us-west', 'Between Washington and California on the Pacific.', { x: 12, y: 28 }, ['Washington', 'Idaho', 'Nevada', 'California'], 4_233_358),
  state('CA', 'California', 'Sacramento', 'us-west', 'Golden State — longest Pacific coastline in the U.S.', { x: 10, y: 48 }, ['Oregon', 'Nevada', 'Arizona'], 38_965_193),
  state('AK', 'Alaska', 'Juneau', 'us-west', 'Largest U.S. state — far northwest.', { x: 8, y: 8 }, [], 733_406),
  state('HI', 'Hawaii', 'Honolulu', 'us-west', 'Island state in the central Pacific.', { x: 22, y: 86 }, [], 1_435_138),
]
