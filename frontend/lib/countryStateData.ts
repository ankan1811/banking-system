export type CountryData = {
  code: string;
  name: string;
  flag: string;
  states: { code: string; name: string }[];
};

/** Converts an ISO 3166-1 alpha-2 country code to its flag emoji */
export const getFlagEmoji = (code: string) =>
  code.toUpperCase().replace(/./g, (c) =>
    String.fromCodePoint(127397 + c.charCodeAt(0))
  );

export const countries: CountryData[] = [
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    states: [
      { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
      { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
      { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
      { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
      { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
      { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
      { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
      { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
      { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
      { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
      { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
      { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
      { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
      { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
      { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
      { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
      { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
      { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
      { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
      { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
      { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
      { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
      { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
      { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
      { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
      { code: 'DC', name: 'District of Columbia' },
    ],
  },
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    states: [
      { code: 'AP', name: 'Andhra Pradesh' }, { code: 'AR', name: 'Arunachal Pradesh' },
      { code: 'AS', name: 'Assam' }, { code: 'BR', name: 'Bihar' },
      { code: 'CG', name: 'Chhattisgarh' }, { code: 'GA', name: 'Goa' },
      { code: 'GJ', name: 'Gujarat' }, { code: 'HR', name: 'Haryana' },
      { code: 'HP', name: 'Himachal Pradesh' }, { code: 'JK', name: 'Jammu & Kashmir' },
      { code: 'JH', name: 'Jharkhand' }, { code: 'KA', name: 'Karnataka' },
      { code: 'KL', name: 'Kerala' }, { code: 'MP', name: 'Madhya Pradesh' },
      { code: 'MH', name: 'Maharashtra' }, { code: 'MN', name: 'Manipur' },
      { code: 'ML', name: 'Meghalaya' }, { code: 'MZ', name: 'Mizoram' },
      { code: 'NL', name: 'Nagaland' }, { code: 'OD', name: 'Odisha' },
      { code: 'PB', name: 'Punjab' }, { code: 'RJ', name: 'Rajasthan' },
      { code: 'SK', name: 'Sikkim' }, { code: 'TN', name: 'Tamil Nadu' },
      { code: 'TS', name: 'Telangana' }, { code: 'TR', name: 'Tripura' },
      { code: 'UP', name: 'Uttar Pradesh' }, { code: 'UK', name: 'Uttarakhand' },
      { code: 'WB', name: 'West Bengal' }, { code: 'DL', name: 'Delhi' },
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    states: [
      { code: 'AB', name: 'Alberta' }, { code: 'BC', name: 'British Columbia' },
      { code: 'MB', name: 'Manitoba' }, { code: 'NB', name: 'New Brunswick' },
      { code: 'NL', name: 'Newfoundland and Labrador' }, { code: 'NS', name: 'Nova Scotia' },
      { code: 'ON', name: 'Ontario' }, { code: 'PE', name: 'Prince Edward Island' },
      { code: 'QC', name: 'Quebec' }, { code: 'SK', name: 'Saskatchewan' },
      { code: 'NT', name: 'Northwest Territories' }, { code: 'NU', name: 'Nunavut' },
      { code: 'YT', name: 'Yukon' },
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    states: [
      { code: 'ENG', name: 'England' }, { code: 'SCT', name: 'Scotland' },
      { code: 'WLS', name: 'Wales' }, { code: 'NIR', name: 'Northern Ireland' },
    ],
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    states: [
      { code: 'NSW', name: 'New South Wales' }, { code: 'VIC', name: 'Victoria' },
      { code: 'QLD', name: 'Queensland' }, { code: 'WA', name: 'Western Australia' },
      { code: 'SA', name: 'South Australia' }, { code: 'TAS', name: 'Tasmania' },
      { code: 'ACT', name: 'Australian Capital Territory' }, { code: 'NT', name: 'Northern Territory' },
    ],
  },
  {
    code: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    states: [
      { code: 'BW', name: 'Baden-Württemberg' }, { code: 'BY', name: 'Bavaria' },
      { code: 'BE', name: 'Berlin' }, { code: 'BB', name: 'Brandenburg' },
      { code: 'HB', name: 'Bremen' }, { code: 'HH', name: 'Hamburg' },
      { code: 'HE', name: 'Hesse' }, { code: 'NI', name: 'Lower Saxony' },
      { code: 'MV', name: 'Mecklenburg-Vorpommern' }, { code: 'NW', name: 'North Rhine-Westphalia' },
      { code: 'RP', name: 'Rhineland-Palatinate' }, { code: 'SL', name: 'Saarland' },
      { code: 'SN', name: 'Saxony' }, { code: 'ST', name: 'Saxony-Anhalt' },
      { code: 'SH', name: 'Schleswig-Holstein' }, { code: 'TH', name: 'Thuringia' },
    ],
  },
  {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    states: [
      { code: 'ARA', name: 'Auvergne-Rhône-Alpes' }, { code: 'BFC', name: 'Bourgogne-Franche-Comté' },
      { code: 'BRE', name: 'Brittany' }, { code: 'CVL', name: 'Centre-Val de Loire' },
      { code: 'GES', name: 'Grand Est' }, { code: 'HDF', name: 'Hauts-de-France' },
      { code: 'IDF', name: 'Île-de-France' }, { code: 'NOR', name: 'Normandy' },
      { code: 'NAQ', name: 'Nouvelle-Aquitaine' }, { code: 'OCC', name: 'Occitanie' },
      { code: 'PDL', name: 'Pays de la Loire' }, { code: 'PAC', name: "Provence-Alpes-Côte d'Azur" },
    ],
  },
  {
    code: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    states: [
      { code: 'TK', name: 'Tokyo' }, { code: 'OS', name: 'Osaka' },
      { code: 'KY', name: 'Kyoto' }, { code: 'HK', name: 'Hokkaido' },
      { code: 'FC', name: 'Fukuoka' }, { code: 'AI', name: 'Aichi' },
      { code: 'HG', name: 'Hyogo' }, { code: 'KN', name: 'Kanagawa' },
      { code: 'CB', name: 'Chiba' }, { code: 'ST', name: 'Saitama' },
    ],
  },
  {
    code: 'BR',
    name: 'Brazil',
    flag: '🇧🇷',
    states: [
      { code: 'SP', name: 'São Paulo' }, { code: 'RJ', name: 'Rio de Janeiro' },
      { code: 'MG', name: 'Minas Gerais' }, { code: 'BA', name: 'Bahia' },
      { code: 'PR', name: 'Paraná' }, { code: 'RS', name: 'Rio Grande do Sul' },
      { code: 'PE', name: 'Pernambuco' }, { code: 'CE', name: 'Ceará' },
      { code: 'PA', name: 'Pará' }, { code: 'SC', name: 'Santa Catarina' },
      { code: 'GO', name: 'Goiás' }, { code: 'DF', name: 'Distrito Federal' },
    ],
  },
  {
    code: 'MX',
    name: 'Mexico',
    flag: '🇲🇽',
    states: [
      { code: 'CMX', name: 'Mexico City' }, { code: 'JAL', name: 'Jalisco' },
      { code: 'NLE', name: 'Nuevo León' }, { code: 'MEX', name: 'State of Mexico' },
      { code: 'VER', name: 'Veracruz' }, { code: 'PUE', name: 'Puebla' },
      { code: 'GUA', name: 'Guanajuato' }, { code: 'CHH', name: 'Chihuahua' },
      { code: 'TAM', name: 'Tamaulipas' }, { code: 'BCN', name: 'Baja California' },
    ],
  },
];

export const getStatesForCountry = (countryCode: string) => {
  const country = countries.find((c) => c.code === countryCode);
  return country?.states ?? [];
};
