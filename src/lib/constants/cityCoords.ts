export interface CityCoord {
  lat: number;
  lng: number;
  aliases?: string[]; // alternative search terms e.g. ["東京", "tokyo", "tyo"]
}

export interface HotPlace {
  zh: string;
  en: string;
  countryZh: string;
  countryEn: string;
}

export interface HotSpot {
  keywords: string[];
  lat: number;
  lng: number;
}

// Unified raw dataset
interface LocationData {
  key: string;
  zh: string;
  en: string;
  countryZh: string;
  countryEn: string;
  lat: number;
  lng: number;
  aliases?: string[];
}

const UNIFIED_LOCATIONS_DATA: LocationData[] = [
  // --- Japan ---
  { key: "tokyo", zh: "東京", en: "Tokyo", countryZh: "日本", countryEn: "Japan", lat: 35.6762, lng: 139.6503, aliases: ["東京", "tokyo", "tyo"] },
  { key: "okinawa", zh: "沖繩", en: "Okinawa", countryZh: "日本", countryEn: "Japan", lat: 26.2124, lng: 127.6809, aliases: ["沖繩", "okinawa"] },
  { key: "kyoto", zh: "京都", en: "Kyoto", countryZh: "日本", countryEn: "Japan", lat: 35.0116, lng: 135.7681, aliases: ["京都", "kyoto"] },
  { key: "osaka", zh: "大阪", en: "Osaka", countryZh: "日本", countryEn: "Japan", lat: 34.6937, lng: 135.5023, aliases: ["大阪", "osaka"] },
  { key: "hokkaido", zh: "北海道", en: "Hokkaido", countryZh: "日本", countryEn: "Japan", lat: 43.0621, lng: 141.3544, aliases: ["北海道", "hokkaido"] },
  { key: "sapporo", zh: "札幌", en: "Sapporo", countryZh: "日本", countryEn: "Japan", lat: 43.0618, lng: 141.3545, aliases: ["札幌", "sapporo"] },
  { key: "fukuoka", zh: "福岡", en: "Fukuoka", countryZh: "日本", countryEn: "Japan", lat: 33.5904, lng: 130.4017, aliases: ["福岡", "fukuoka"] },
  { key: "hiroshima", zh: "廣島", en: "Hiroshima", countryZh: "日本", countryEn: "Japan", lat: 34.3853, lng: 132.4553, aliases: ["廣島", "hiroshima"] },
  { key: "nara", zh: "奈良", en: "Nara", countryZh: "日本", countryEn: "Japan", lat: 34.6851, lng: 135.8050, aliases: ["奈良", "nara"] },
  { key: "hakone", zh: "箱根", en: "Hakone", countryZh: "日本", countryEn: "Japan", lat: 35.2322, lng: 139.1069, aliases: ["箱根", "hakone"] },
  { key: "yokohama", zh: "橫濱", en: "Yokohama", countryZh: "日本", countryEn: "Japan", lat: 35.4437, lng: 139.6380, aliases: ["橫濱", "yokohama"] },
  { key: "kobe", zh: "神戶", en: "Kobe", countryZh: "日本", countryEn: "Japan", lat: 34.6901, lng: 135.1956, aliases: ["神戶", "kobe"] },
  { key: "nagoya", zh: "名古屋", en: "Nagoya", countryZh: "日本", countryEn: "Japan", lat: 35.1815, lng: 136.9066, aliases: ["名古屋", "nagoya"] },
  { key: "karuizawa", zh: "輕井澤", en: "Karuizawa", countryZh: "日本", countryEn: "Japan", lat: 36.3483, lng: 138.6358, aliases: ["輕井澤", "karuizawa"] },
  { key: "otaru", zh: "小樽", en: "Otaru", countryZh: "日本", countryEn: "Japan", lat: 43.1907, lng: 140.9947, aliases: ["小樽", "otaru"] },
  { key: "sendai", zh: "仙台", en: "Sendai", countryZh: "日本", countryEn: "Japan", lat: 38.2682, lng: 140.8694, aliases: ["仙台", "sendai"] },
  { key: "shizuoka", zh: "靜岡", en: "Shizuoka", countryZh: "日本", countryEn: "Japan", lat: 34.9756, lng: 138.3828, aliases: ["靜岡", "shizuoka"] },
  { key: "kumamoto", zh: "熊本", en: "Kumamoto", countryZh: "日本", countryEn: "Japan", lat: 32.7898, lng: 130.7417, aliases: ["熊本", "kumamoto"] },
  { key: "nagano", zh: "長野", en: "Nagano", countryZh: "日本", countryEn: "Japan", lat: 36.6513, lng: 138.1810, aliases: ["長野", "nagano"] },

  // --- Taiwan ---
  { key: "taipei", zh: "台北", en: "Taipei", countryZh: "台灣", countryEn: "Taiwan", lat: 25.0330, lng: 121.5654, aliases: ["台北", "臺北", "taipei", "taiwan"] },
  { key: "kaohsiung", zh: "高雄", en: "Kaohsiung", countryZh: "台灣", countryEn: "Taiwan", lat: 22.6273, lng: 120.3014, aliases: ["高雄", "kaohsiung"] },
  { key: "taichung", zh: "台中", en: "Taichung", countryZh: "台灣", countryEn: "Taiwan", lat: 24.1477, lng: 120.6736, aliases: ["台中", "臺中", "taichung"] },
  { key: "tainan", zh: "台南", en: "Tainan", countryZh: "台灣", countryEn: "Taiwan", lat: 22.9999, lng: 120.2269, aliases: ["台南", "臺南", "tainan"] },
  { key: "hualien", zh: "花蓮", en: "Hualien", countryZh: "台灣", countryEn: "Taiwan", lat: 23.9871, lng: 121.6015, aliases: ["花蓮", "hualien"] },
  { key: "kenting", zh: "墾丁", en: "Kenting", countryZh: "台灣", countryEn: "Taiwan", lat: 21.9483, lng: 120.7979, aliases: ["墾丁", "kenting"] },
  { key: "taitung", zh: "台東", en: "Taitung", countryZh: "台灣", countryEn: "Taiwan", lat: 22.7560, lng: 121.1510, aliases: ["台東", "臺東", "taitung"] },
  { key: "yilan", zh: "宜蘭", en: "Yilan", countryZh: "台灣", countryEn: "Taiwan", lat: 24.7570, lng: 121.7530, aliases: ["宜蘭", "yilan"] },
  { key: "hsinchu", zh: "新竹", en: "Hsinchu", countryZh: "台灣", countryEn: "Taiwan", lat: 24.8036, lng: 120.9686, aliases: ["新竹", "hsinchu"] },
  { key: "alishan", zh: "阿里山", en: "Alishan", countryZh: "台灣", countryEn: "Taiwan", lat: 23.5113, lng: 120.8031, aliases: ["阿里山", "alishan"] },
  { key: "penghu", zh: "澎湖", en: "Penghu", countryZh: "台灣", countryEn: "Taiwan", lat: 23.5711, lng: 119.5793, aliases: ["澎湖", "penghu"] },
  { key: "kinmen", zh: "金門", en: "Kinmen", countryZh: "台灣", countryEn: "Taiwan", lat: 24.4497, lng: 118.3775, aliases: ["金門", "kinmen"] },
  { key: "nantou", zh: "南投", en: "Nantou", countryZh: "台灣", countryEn: "Taiwan", lat: 23.9060, lng: 120.6869, aliases: ["南投", "nantou"] },
  { key: "miaoli", zh: "苗栗", en: "Miaoli", countryZh: "台灣", countryEn: "Taiwan", lat: 24.5649, lng: 120.8208, aliases: ["苗栗", "miaoli"] },
  { key: "changhua", zh: "彰化", en: "Changhua", countryZh: "台灣", countryEn: "Taiwan", lat: 24.0817, lng: 120.5385, aliases: ["彰化", "changhua"] },
  { key: "chiayi", zh: "嘉義", en: "Chiayi", countryZh: "台灣", countryEn: "Taiwan", lat: 23.4791, lng: 120.4411, aliases: ["嘉義", "chiayi"] },

  // --- Korea ---
  { key: "seoul", zh: "首爾", en: "Seoul", countryZh: "韓國", countryEn: "South Korea", lat: 37.5665, lng: 126.9780, aliases: ["首爾", "seoul"] },
  { key: "busan", zh: "釜山", en: "Busan", countryZh: "韓國", countryEn: "South Korea", lat: 35.1796, lng: 129.0756, aliases: ["釜山", "busan"] },
  { key: "jeju", zh: "濟州島", en: "Jeju Island", countryZh: "韓國", countryEn: "South Korea", lat: 33.4890, lng: 126.4983, aliases: ["濟州", "濟州島", "jeju"] },
  { key: "incheon", zh: "仁川", en: "Incheon", countryZh: "韓國", countryEn: "South Korea", lat: 37.4563, lng: 126.7052, aliases: ["仁川", "incheon"] },
  { key: "daegu", zh: "大邱", en: "Daegu", countryZh: "韓國", countryEn: "South Korea", lat: 35.8714, lng: 128.6014, aliases: ["大邱", "daegu"] },
  { key: "gyeongju", zh: "慶州", en: "Gyeongju", countryZh: "韓國", countryEn: "South Korea", lat: 35.8562, lng: 129.2132, aliases: ["慶州", "gyeongju"] },
  { key: "gangneung", zh: "江陵", en: "Gangneung", countryZh: "韓國", countryEn: "South Korea", lat: 37.7519, lng: 128.8761, aliases: ["江陵", "gangneung"] },
  { key: "yeosu", zh: "麗水", en: "Yeosu", countryZh: "韓國", countryEn: "South Korea", lat: 34.7604, lng: 127.6622, aliases: ["麗水", "yeosu"] },

  // --- Thailand ---
  { key: "bangkok", zh: "曼谷", en: "Bangkok", countryZh: "泰國", countryEn: "Thailand", lat: 13.7563, lng: 100.5018, aliases: ["曼谷", "bangkok"] },
  { key: "pattaya", zh: "芭達雅", en: "Pattaya", countryZh: "泰國", countryEn: "Thailand", lat: 12.9236, lng: 100.8824, aliases: ["芭達雅", "pattaya"] },
  { key: "chiang_mai", zh: "清邁", en: "Chiang Mai", countryZh: "泰國", countryEn: "Thailand", lat: 18.7883, lng: 98.9853, aliases: ["清邁", "chiang mai", "chiang_mai"] },
  { key: "phuket", zh: "普吉島", en: "Phuket", countryZh: "泰國", countryEn: "Thailand", lat: 7.8804, lng: 98.3923, aliases: ["普吉島", "phuket"] },
  { key: "koh_samui", zh: "蘇美島", en: "Koh Samui", countryZh: "泰國", countryEn: "Thailand", lat: 9.5120, lng: 100.0136, aliases: ["蘇美島", "koh samui", "koh_samui"] },
  { key: "hua_hin", zh: "華欣", en: "Hua Hin", countryZh: "泰國", countryEn: "Thailand", lat: 12.5712, lng: 99.9576, aliases: ["華欣", "hua hin"] },
  { key: "krabi", zh: "喀比", en: "Krabi", countryZh: "泰國", countryEn: "Thailand", lat: 8.0863, lng: 98.9063, aliases: ["喀比", "krabi"] },
  { key: "chiang_rai", zh: "清萊", en: "Chiang Rai", countryZh: "泰國", countryEn: "Thailand", lat: 19.9076, lng: 99.8325, aliases: ["清萊", "chiang rai"] },
  { key: "kanchanaburi", zh: "北碧", en: "Kanchanaburi", countryZh: "泰國", countryEn: "Thailand", lat: 14.0228, lng: 99.5328, aliases: ["北碧", "kanchanaburi"] },

  // --- Vietnam ---
  { key: "hanoi", zh: "河內", en: "Hanoi", countryZh: "越南", countryEn: "Vietnam", lat: 21.0278, lng: 105.8342, aliases: ["河內", "hanoi"] },
  { key: "ho_chi_minh", zh: "胡志明市", en: "Ho Chi Minh City", countryZh: "越南", countryEn: "Vietnam", lat: 10.8231, lng: 106.6297, aliases: ["胡志明", "胡志明市", "ho chi minh", "ho_chi_minh"] },
  { key: "danang", zh: "峴港", en: "Da Nang", countryZh: "越南", countryEn: "Vietnam", lat: 16.0544, lng: 108.2022, aliases: ["峴港", "danang", "da nang"] },
  { key: "hoi_an", zh: "會安", en: "Hoi An", countryZh: "越南", countryEn: "Vietnam", lat: 15.8801, lng: 108.3380, aliases: ["會安", "hoi an"] },
  { key: "ha_long_bay", zh: "下龍灣", en: "Ha Long Bay", countryZh: "越南", countryEn: "Vietnam", lat: 20.9756, lng: 107.0461, aliases: ["下龍灣", "ha long bay"] },
  { key: "nha_trang", zh: "芽莊", en: "Nha Trang", countryZh: "越南", countryEn: "Vietnam", lat: 12.2388, lng: 109.1967, aliases: ["芽莊", "nha trang"] },
  { key: "da_lat", zh: "大叻", en: "Da Lat", countryZh: "越南", countryEn: "Vietnam", lat: 11.9404, lng: 108.4583, aliases: ["大叻", "da lat"] },
  { key: "phu_quoc", zh: "富國島", en: "Phu Quoc", countryZh: "越南", countryEn: "Vietnam", lat: 10.2111, lng: 103.9583, aliases: ["富國島", "phu quoc"] },

  // --- Australia ---
  { key: "sydney", zh: "雪梨", en: "Sydney", countryZh: "澳洲", countryEn: "Australia", lat: -33.8688, lng: 151.2093, aliases: ["雪梨", "悉尼", "sydney"] },
  { key: "melbourne", zh: "墨爾本", en: "Melbourne", countryZh: "澳洲", countryEn: "Australia", lat: -37.8136, lng: 144.9631, aliases: ["墨爾本", "melbourne"] },
  { key: "brisbane", zh: "布里斯本", en: "Brisbane", countryZh: "澳洲", countryEn: "Australia", lat: -27.4698, lng: 153.0251, aliases: ["布里斯本", "brisbane"] },
  { key: "gold_coast", zh: "黃金海岸", en: "Gold Coast", countryZh: "澳洲", countryEn: "Australia", lat: -28.0167, lng: 153.4000, aliases: ["黃金海岸", "gold coast", "gold_coast"] },
  { key: "canberra", zh: "坎培拉", en: "Canberra", countryZh: "澳洲", countryEn: "Australia", lat: -35.2809, lng: 149.1300, aliases: ["坎培拉", "canberra"] },
  { key: "perth", zh: "珀斯", en: "Perth", countryZh: "澳洲", countryEn: "Australia", lat: -31.9505, lng: 115.8605, aliases: ["珀斯", "perth"] },
  { key: "cairns", zh: "凱恩斯", en: "Cairns", countryZh: "澳洲", countryEn: "Australia", lat: -16.9186, lng: 145.7781, aliases: ["凱恩斯", "cairns"] },
  { key: "adelaide", zh: "阿德萊德", en: "Adelaide", countryZh: "澳洲", countryEn: "Australia", lat: -34.9285, lng: 138.6007, aliases: ["阿德萊德", "adelaide"] },
  { key: "hobart", zh: "荷巴特", en: "Hobart", countryZh: "澳洲", countryEn: "Australia", lat: -42.8821, lng: 147.3272, aliases: ["荷巴特", "hobart"] },

  // --- Hong Kong / Macau ---
  { key: "hong_kong", zh: "香港", en: "Hong Kong", countryZh: "香港", countryEn: "Hong Kong", lat: 22.3193, lng: 114.1694, aliases: ["香港", "hong kong", "hong_kong", "hkg"] },
  { key: "macau", zh: "澳門", en: "Macau", countryZh: "澳門", countryEn: "Macau", lat: 22.1987, lng: 113.5439, aliases: ["澳門", "macau"] },

  // --- China ---
  { key: "beijing", zh: "北京", en: "Beijing", countryZh: "中國", countryEn: "China", lat: 39.9042, lng: 116.4074, aliases: ["北京", "beijing"] },
  { key: "shanghai", zh: "上海", en: "Shanghai", countryZh: "中國", countryEn: "China", lat: 31.2304, lng: 121.4737, aliases: ["上海", "shanghai"] },

  // --- Europe ---
  { key: "paris", zh: "巴黎", en: "Paris", countryZh: "法國", countryEn: "France", lat: 48.8566, lng: 2.3522, aliases: ["巴黎", "paris"] },
  { key: "london", zh: "倫敦", en: "London", countryZh: "英國", countryEn: "United Kingdom", lat: 51.5074, lng: -0.1278, aliases: ["倫敦", "london"] },
  { key: "rome", zh: "羅馬", en: "Rome", countryZh: "義大利", countryEn: "Italy", lat: 41.9028, lng: 12.4964, aliases: ["羅馬", "rome"] },
  { key: "barcelona", zh: "巴塞隆納", en: "Barcelona", countryZh: "西班牙", countryEn: "Spain", lat: 41.3851, lng: 2.1734, aliases: ["巴塞隆納", "barcelona"] },
  { key: "amsterdam", zh: "阿姆斯特丹", en: "Amsterdam", countryZh: "荷蘭", countryEn: "Netherlands", lat: 52.3676, lng: 4.9041, aliases: ["阿姆斯特丹", "amsterdam"] },
  { key: "vienna", zh: "維也納", en: "Vienna", countryZh: "奧地利", countryEn: "Austria", lat: 48.2082, lng: 16.3738, aliases: ["維也納", "vienna"] },
  { key: "prague", zh: "布拉格", en: "Prague", countryZh: "捷克", countryEn: "Czech Republic", lat: 50.0755, lng: 14.4378, aliases: ["布拉格", "prague"] },
  { key: "berlin", zh: "柏林", en: "Berlin", countryZh: "德國", countryEn: "Germany", lat: 52.5200, lng: 13.4050, aliases: ["柏林", "berlin"] },
  { key: "zurich", zh: "蘇黎世", en: "Zurich", countryZh: "瑞士", countryEn: "Switzerland", lat: 47.3769, lng: 8.5417, aliases: ["蘇黎世", "zurich"] },
  { key: "milan", zh: "米蘭", en: "Milan", countryZh: "義大利", countryEn: "Italy", lat: 45.4642, lng: 9.1900, aliases: ["米蘭", "milan"] },
  { key: "venice", zh: "威尼斯", en: "Venice", countryZh: "義大利", countryEn: "Italy", lat: 45.4408, lng: 12.3155, aliases: ["威尼斯", "venice"] },
  { key: "florence", zh: "佛羅倫斯", en: "Florence", countryZh: "義大利", countryEn: "Italy", lat: 43.7696, lng: 11.2558, aliases: ["佛羅倫斯", "florence"] },
  { key: "lisbon", zh: "里斯本", en: "Lisbon", countryZh: "葡萄牙", countryEn: "Portugal", lat: 38.7223, lng: -9.1393, aliases: ["里斯本", "lisbon"] },
  { key: "munich", zh: "慕尼黑", en: "Munich", countryZh: "德國", countryEn: "Germany", lat: 48.1351, lng: 11.5820, aliases: ["慕尼黑", "munich"] },

  // --- Americas ---
  { key: "new_york", zh: "紐約", en: "New York", countryZh: "美國", countryEn: "United States", lat: 40.7128, lng: -74.0060, aliases: ["紐約", "new york", "new_york", "nyc"] },
  { key: "los_angeles", zh: "洛杉磯", en: "Los Angeles", countryZh: "美國", countryEn: "United States", lat: 34.0522, lng: -118.2437, aliases: ["洛杉磯", "los angeles", "los_angeles"] },
  { key: "san_francisco", zh: "舊金山", en: "San Francisco", countryZh: "美國", countryEn: "United States", lat: 37.7749, lng: -122.4194, aliases: ["舊金山", "san francisco", "san_francisco"] },
  { key: "chicago", zh: "芝加哥", en: "Chicago", countryZh: "美國", countryEn: "United States", lat: 41.8781, lng: -87.6298, aliases: ["芝加哥", "chicago"] },
  { key: "hawaii", zh: "夏威夷", en: "Hawaii", countryZh: "美國", countryEn: "United States", lat: 21.3069, lng: -157.8583, aliases: ["夏威夷", "hawaii"] },
  { key: "vancouver", zh: "溫哥華", en: "Vancouver", countryZh: "加拿大", countryEn: "Canada", lat: 49.2827, lng: -123.1207, aliases: ["溫哥華", "vancouver"] },
  { key: "toronto", zh: "多倫多", en: "Toronto", countryZh: "加拿大", countryEn: "Canada", lat: 43.6532, lng: -79.3832, aliases: ["多倫多", "toronto"] },
  { key: "miami", zh: "邁阿密", en: "Miami", countryZh: "美國", countryEn: "United States", lat: 25.7617, lng: -80.1918, aliases: ["邁阿密", "miami"] },
  { key: "boston", zh: "波士頓", en: "Boston", countryZh: "美國", countryEn: "United States", lat: 42.3601, lng: -71.0589, aliases: ["波士頓", "boston"] },
  { key: "seattle", zh: "西雅圖", en: "Seattle", countryZh: "美國", countryEn: "United States", lat: 47.6062, lng: -122.3321, aliases: ["西雅圖", "seattle"] },

  // --- Northern Europe ---
  { key: "copenhagen", zh: "哥本哈根", en: "Copenhagen", countryZh: "丹麥", countryEn: "Denmark", lat: 55.6761, lng: 12.5683, aliases: ["哥本哈根", "copenhagen"] },
  { key: "oslo", zh: "奧斯陸", en: "Oslo", countryZh: "挪威", countryEn: "Norway", lat: 59.9139, lng: 10.7522, aliases: ["奧斯陸", "oslo"] },
  { key: "stockholm", zh: "斯德哥爾摩", en: "Stockholm", countryZh: "瑞典", countryEn: "Sweden", lat: 59.3293, lng: 18.0686, aliases: ["斯德哥爾摩", "stockholm"] },
  { key: "helsinki", zh: "赫爾辛基", en: "Helsinki", countryZh: "芬蘭", countryEn: "Finland", lat: 60.1699, lng: 24.9384, aliases: ["赫爾辛基", "helsinki"] },
  { key: "reykjavik", zh: "雷克雅維克", en: "Reykjavik", countryZh: "冰島", countryEn: "Iceland", lat: 64.1265, lng: -21.8174, aliases: ["雷克雅維克", "reykjavik"] },
  { key: "iceland", zh: "冰島", en: "Iceland", countryZh: "冰島", countryEn: "Iceland", lat: 64.9631, lng: -19.0208, aliases: ["冰島", "iceland"] }
];

// Generate CITY_COORDS map
export const CITY_COORDS: Record<string, CityCoord> = {};
UNIFIED_LOCATIONS_DATA.forEach(loc => {
  CITY_COORDS[loc.key] = {
    lat: loc.lat,
    lng: loc.lng,
    aliases: loc.aliases
  };
});

// Generate POPULAR_HOT_PLACES array
export const POPULAR_HOT_PLACES: HotPlace[] = UNIFIED_LOCATIONS_DATA.map(loc => ({
  zh: loc.zh,
  en: loc.en,
  countryZh: loc.countryZh,
  countryEn: loc.countryEn
}));

// Landmark spots mapping
export const HOT_SPOTS: HotSpot[] = [
  // Tokyo
  { keywords: ["gyoen", "御苑"], lat: 35.6852, lng: 139.7101 },
  { keywords: ["crossing", "澀谷", "shibuya"], lat: 35.6580, lng: 139.7016 },
  { keywords: ["tsukiji", "築地"], lat: 35.6658, lng: 139.7701 },
  { keywords: ["sensoji", "淺草", "asakusa"], lat: 35.7148, lng: 139.7967 },
  { keywords: ["akihabara", "秋葉"], lat: 35.6997, lng: 139.7715 },
  { keywords: ["tower", "東京鐵塔"], lat: 35.6586, lng: 139.7454 },
  { keywords: ["disney", "迪士尼"], lat: 35.6329, lng: 139.8804 },
  { keywords: ["shinjuku", "新宿"], lat: 35.6909, lng: 139.7003 },

  // Hong Kong
  { keywords: ["victoria", "peak", "太平山"], lat: 22.2759, lng: 114.1455 },
  { keywords: ["tsim sha tsui", "tst", "尖沙咀"], lat: 22.2988, lng: 114.1722 },
  { keywords: ["ocean park", "海洋公園"], lat: 22.2475, lng: 114.1744 },
  { keywords: ["disneyland", "迪士尼"], lat: 22.3130, lng: 114.0413 },
  { keywords: ["lan kwai fong", "蘭桂坊"], lat: 22.2808, lng: 114.1557 },

  // Paris
  { keywords: ["eiffel", "鐵塔"], lat: 48.8584, lng: 2.2945 },
  { keywords: ["louvre", "羅浮宮"], lat: 48.8606, lng: 2.3376 },
  { keywords: ["arc", "凱旋門"], lat: 48.8738, lng: 2.2950 },

  // London
  { keywords: ["ben", "笨鐘"], lat: 51.5007, lng: -0.1246 },
  { keywords: ["eye", "眼"], lat: 51.5033, lng: -0.1195 }
];
