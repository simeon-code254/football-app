// Canonical position list — also drives the outfield-vs-goalkeeper attribute
// template decision made for the platform (see engineering plan).
export const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'] as const;

export const GENDERS = ['Male', 'Female', 'Prefer not to say'] as const;

export const NATIONALITIES = [
  'Nigeria', 'Ghana', 'Senegal', 'Cameroon', 'Ivory Coast', 'Morocco', 'Egypt', 'South Africa',
  'Kenya', 'Algeria', 'Tunisia', 'England', 'France', 'Spain', 'Portugal', 'Germany', 'Italy',
  'Netherlands', 'Belgium', 'Brazil', 'Argentina', 'United States', 'Mexico', 'Other',
] as const;
