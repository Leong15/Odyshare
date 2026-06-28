export interface CityCoord {
  lat: number;
  lng: number;
  aliases?: string[]; // alternative search terms e.g. ["東京", "tokyo", "tyo"]
}

export const CITY_COORDS: Record<string, CityCoord> = {
  // Japan
  tokyo: {
    lat: 35.6762,
    lng: 139.6503,
    aliases: ["東京", "tokyo", "tyo"]
  },
  okinawa: {
    lat: 26.2124,
    lng: 127.6809,
    aliases: ["沖繩", "okinawa"]
  },
  kyoto: {
    lat: 35.0116,
    lng: 135.7681,
    aliases: ["京都", "kyoto"]
  },
  osaka: {
    lat: 34.6937,
    lng: 135.5023,
    aliases: ["大阪", "osaka"]
  },
  hokkaido: {
    lat: 43.0621,
    lng: 141.3544,
    aliases: ["北海道", "hokkaido"]
  },
  sapporo: {
    lat: 43.0618,
    lng: 141.3545,
    aliases: ["札幌", "sapporo"]
  },
  fukuoka: {
    lat: 33.5904,
    lng: 130.4017,
    aliases: ["福岡", "fukuoka"]
  },
  hiroshima: {
    lat: 34.3853,
    lng: 132.4553,
    aliases: ["廣島", "hiroshima"]
  },
  nara: {
    lat: 34.6851,
    lng: 135.8050,
    aliases: ["奈良", "nara"]
  },
  hakone: {
    lat: 35.2322,
    lng: 139.1069,
    aliases: ["箱根", "hakone"]
  },
  yokohama: {
    lat: 35.4437,
    lng: 139.6380,
    aliases: ["橫濱", "yokohama"]
  },
  kobe: {
    lat: 34.6901,
    lng: 135.1956,
    aliases: ["神戶", "kobe"]
  },

  // Taiwan
  taipei: {
    lat: 25.0330,
    lng: 121.5654,
    aliases: ["台北", "臺北", "taipei", "taiwan"]
  },
  yilan: {
    lat: 24.7570,
    lng: 121.7530,
    aliases: ["宜蘭", "yilan"]
  },
  kaohsiung: {
    lat: 22.6273,
    lng: 120.3014,
    aliases: ["高雄", "kaohsiung"]
  },
  taichung: {
    lat: 24.1477,
    lng: 120.6736,
    aliases: ["台中", "臺中", "taichung"]
  },
  tainan: {
    lat: 22.9999,
    lng: 120.2269,
    aliases: ["台南", "臺南", "tainan"]
  },
  hualien: {
    lat: 23.9871,
    lng: 121.6015,
    aliases: ["花蓮", "hualien"]
  },
  penghu: {
    lat: 23.5711,
    lng: 119.5793,
    aliases: ["澎湖", "penghu"]
  },

  // Hong Kong / Macau
  hong_kong: {
    lat: 22.3193,
    lng: 114.1694,
    aliases: ["香港", "hong kong", "hong_kong", "hkg"]
  },
  macau: {
    lat: 22.1987,
    lng: 113.5439,
    aliases: ["澳門", "macau"]
  },

  // Korea
  seoul: {
    lat: 37.5665,
    lng: 126.9780,
    aliases: ["首爾", "seoul"]
  },
  busan: {
    lat: 35.1796,
    lng: 129.0756,
    aliases: ["釜山", "busan"]
  },
  jeju: {
    lat: 33.4890,
    lng: 126.4983,
    aliases: ["濟州", "jeju"]
  },

  // Southeast Asia
  bangkok: {
    lat: 13.7563,
    lng: 100.5018,
    aliases: ["曼谷", "bangkok"]
  },
  singapore: {
    lat: 1.3521,
    lng: 103.8198,
    aliases: ["新加坡", "singapore"]
  },
  bali: {
    lat: -8.3405,
    lng: 115.0920,
    aliases: ["峇里島", "bali"]
  },
  kuala_lumpur: {
    lat: 3.1390,
    lng: 101.6869,
    aliases: ["吉隆坡", "kuala lumpur", "kuala_lumpur"]
  },
  phuket: {
    lat: 7.8804,
    lng: 98.3923,
    aliases: ["普吉島", "phuket"]
  },
  chiang_mai: {
    lat: 18.7883,
    lng: 98.9853,
    aliases: ["清邁", "chiang mai", "chiang_mai"]
  },
  hanoi: {
    lat: 21.0278,
    lng: 105.8342,
    aliases: ["河內", "hanoi"]
  },
  ho_chi_minh: {
    lat: 10.8231,
    lng: 106.6297,
    aliases: ["胡志明", "ho chi minh", "ho_chi_minh"]
  },
  danang: {
    lat: 16.0544,
    lng: 108.2022,
    aliases: ["峴港", "danang"]
  },

  // Europe
  paris: {
    lat: 48.8566,
    lng: 2.3522,
    aliases: ["巴黎", "paris"]
  },
  london: {
    lat: 51.5074,
    lng: -0.1278,
    aliases: ["倫敦", "london"]
  },
  rome: {
    lat: 41.9028,
    lng: 12.4964,
    aliases: ["羅馬", "rome"]
  },
  barcelona: {
    lat: 41.3851,
    lng: 2.1734,
    aliases: ["巴塞隆納", "barcelona"]
  },
  amsterdam: {
    lat: 52.3676,
    lng: 4.9041,
    aliases: ["阿姆斯特丹", "amsterdam"]
  },
  vienna: {
    lat: 48.2082,
    lng: 16.3738,
    aliases: ["維也納", "vienna"]
  },
  prague: {
    lat: 50.0755,
    lng: 14.4378,
    aliases: ["布拉格", "prague"]
  },
  berlin: {
    lat: 52.5200,
    lng: 13.4050,
    aliases: ["柏林", "berlin"]
  },
  zurich: {
    lat: 47.3769,
    lng: 8.5417,
    aliases: ["蘇黎世", "zurich"]
  },
  milan: {
    lat: 45.4642,
    lng: 9.1900,
    aliases: ["米蘭", "milan"]
  },
  venice: {
    lat: 45.4408,
    lng: 12.3155,
    aliases: ["威尼斯", "venice"]
  },
  lisbon: {
    lat: 38.7223,
    lng: -9.1393,
    aliases: ["里斯本", "lisbon"]
  },
  reykjavik: {
    lat: 64.1265,
    lng: -21.8174,
    aliases: ["雷克雅維克", "reykjavik"]
  },
  iceland: {
    lat: 64.9631,
    lng: -19.0208,
    aliases: ["冰島", "iceland"]
  },
  copenhagen: {
    lat: 55.6761,
    lng: 12.5683,
    aliases: ["哥本哈根", "copenhagen"]
  },
  stockholm: {
    lat: 59.3293,
    lng: 18.0686,
    aliases: ["斯德哥爾摩", "stockholm"]
  },

  // Americas
  new_york: {
    lat: 40.7128,
    lng: -74.0060,
    aliases: ["紐約", "new york", "new_york", "nyc"]
  },
  los_angeles: {
    lat: 34.0522,
    lng: -118.2437,
    aliases: ["洛杉磯", "los angeles", "los_angeles"]
  },
  san_francisco: {
    lat: 37.7749,
    lng: -122.4194,
    aliases: ["舊金山", "san francisco", "san_francisco"]
  },
  chicago: {
    lat: 41.8781,
    lng: -87.6298,
    aliases: ["芝加哥", "chicago"]
  },
  hawaii: {
    lat: 21.3069,
    lng: -157.8583,
    aliases: ["夏威夷", "hawaii"]
  },
  vancouver: {
    lat: 49.2827,
    lng: -123.1207,
    aliases: ["溫哥華", "vancouver"]
  },
  toronto: {
    lat: 43.6532,
    lng: -79.3832,
    aliases: ["多倫多", "toronto"]
  },
  miami: {
    lat: 25.7617,
    lng: -80.1918,
    aliases: ["邁阿密", "miami"]
  },

  // Oceania
  sydney: {
    lat: -33.8688,
    lng: 151.2093,
    aliases: ["雪梨", "悉尼", "sydney"]
  },
  melbourne: {
    lat: -37.8136,
    lng: 144.9631,
    aliases: ["墨爾本", "melbourne"]
  },
  gold_coast: {
    lat: -28.0167,
    lng: 153.4000,
    aliases: ["黃金海岸", "gold coast", "gold_coast"]
  }
};
