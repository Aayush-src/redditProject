/** Country name → flag emoji for all players in the database */
export const COUNTRY_FLAGS: Record<string, string> = {
  Portugal: '🇵🇹',
  Argentina: '🇦🇷',
  France: '🇫🇷',
  Brazil: '🇧🇷',
  Norway: '🇳🇴',
  Sweden: '🇸🇪',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Croatia: '🇭🇷',
  Poland: '🇵🇱',
  Egypt: '🇪🇬',
  Belgium: '🇧🇪',
  Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  Uruguay: '🇺🇾',
  Netherlands: '🇳🇱',
  Germany: '🇩🇪',
  Spain: '🇪🇸',
  Senegal: '🇸🇳',
  Cameroon: '🇨🇲',
  'Ivory Coast': '🇨🇮',
  Italy: '🇮🇹',
  Colombia: '🇨🇴',
  Gabon: '🇬🇦',
  Chile: '🇨🇱',
  Denmark: '🇩🇰',
  Slovenia: '🇸🇮',
  'Costa Rica': '🇨🇷',
  'South Korea': '🇰🇷',
  Serbia: '🇷🇸',
  Mexico: '🇲🇽',
  Japan: '🇯🇵',
  Morocco: '🇲🇦',
  Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Czech Republic': '🇨🇿',
  Austria: '🇦🇹',
  Switzerland: '🇨🇭',
  Nigeria: '🇳🇬',
  Ghana: '🇬🇭',
  Australia: '🇦🇺',
  'United States': '🇺🇸',
  Canada: '🇨🇦',
};

export function countryFlag(country: string | null | undefined): string {
  if (!country) return '⚽';
  if (COUNTRY_FLAGS[country]) return COUNTRY_FLAGS[country];
  // Already a flag emoji stored in data
  if (country.length <= 4 && !/^[A-Za-z]/.test(country)) return country;
  return '⚽';
}

export function countryName(value: string | null | undefined): string {
  if (!value) return '';
  const entry = Object.entries(COUNTRY_FLAGS).find(([, flag]) => flag === value);
  if (entry) return entry[0];
  if (/^[A-Za-z]/.test(value)) return value;
  return '';
}
