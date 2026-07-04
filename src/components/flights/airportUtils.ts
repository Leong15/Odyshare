export const airportMap: Record<string, { zh: string; en: string }> = {
  TPE: { zh: "台北桃園 (TPE)", en: "Taipei Taoyuan (TPE)" },
  TSA: { zh: "台北松山 (TSA)", en: "Taipei Songshan (TSA)" },
  HKG: { zh: "香港國際機場 (HKG)", en: "Hong Kong Int'l (HKG)" },
  NRT: { zh: "東京成田 (NRT)", en: "Tokyo Narita (NRT)" },
  HND: { zh: "東京羽田 (HND)", en: "Tokyo Haneda (HND)" },
  TYO: { zh: "東京所有機場 (NRT/HND)", en: "Tokyo All Airports (NRT/HND)" },
  KIX: { zh: "大阪關西 (KIX)", en: "Osaka Kansai (KIX)" },
  ITM: { zh: "大阪伊丹 (ITM)", en: "Osaka Itami (ITM)" },
  LAX: { zh: "洛杉磯機場 (LAX)", en: "Los Angeles Int'l (LAX)" },
  SFO: { zh: "舊金山機場 (SFO)", en: "San Francisco Int'l (SFO)" },
  JFK: { zh: "紐約甘迺迪 (JFK)", en: "New York JFK (JFK)" },
  LHR: { zh: "倫敦希斯洛 (LHR)", en: "London Heathrow (LHR)" },
  CDG: { zh: "巴黎戴高樂 (CDG)", en: "Paris CDG (CDG)" },
  SIN: { zh: "新加坡樟宜 (SIN)", en: "Singapore Changi (SIN)" },
  ICN: { zh: "首爾仁川 (ICN)", en: "Seoul Incheon (ICN)" },
  GMP: { zh: "首爾金浦 (GMP)", en: "Seoul Gimpo (GMP)" },
  FUK: { zh: "福岡機場 (FUK)", en: "Fukuoka (FUK)" },
  OKA: { zh: "沖繩那霸 (OKA)", en: "Okinawa Naha (OKA)" },
  CTS: { zh: "札幌新千歲 (CTS)", en: "Sapporo Chitose (CTS)" },
  BKK: { zh: "曼谷蘇凡納布 (BKK)", en: "Bangkok Airport (BKK)" },
  DMK: { zh: "曼谷廊曼 (DMK)", en: "Bangkok Don Mueang (DMK)" },
  MFM: { zh: "澳門機場 (MFM)", en: "Macau (MFM)" },
  KHH: { zh: "高雄小港 (KHH)", en: "Kaohsiung (KHH)" },
  RMQ: { zh: "台中清泉崗 (RMQ)", en: "Taichung (RMQ)" },
};

export function getAirportDisplay(code: string, lang: 'zh' | 'en'): string {
  const upper = (code || "").trim().toUpperCase();
  if (airportMap[upper]) {
    return airportMap[upper][lang];
  }
  for (const [key, value] of Object.entries(airportMap)) {
    if (upper.includes(key)) {
      return value[lang];
    }
  }
  return upper;
}
