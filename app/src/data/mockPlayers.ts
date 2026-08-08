import { images } from '../constants/images';

export type MockPlayer = {
  id: string;
  name: string;
  position: string;
  country: string;
  flag: string;
  age: number;
  city: string;
  club: string;
  overall: number;
  avatar: string;
  attributes: { key: string; val: number; confidence: 'High' | 'Medium' | 'Low' }[];
  matchScore: number; // how closely they match the scout's saved preferences — NOT a football rating
  recentlyActive: boolean;
  videoCount: number;
  strengths: string[];
  watchAreas: string[];
};

// Demo scouting pool — no backend yet, this is what `player_public_view` +
// `player_attribute_scores` (see engineering plan) will eventually back.
export const MOCK_PLAYERS: MockPlayer[] = [
  {
    id: 'kevin-otieno',
    name: 'Kevin Otieno',
    position: 'RW',
    country: 'Kenya',
    flag: '🇰🇪',
    age: 19,
    city: 'Nairobi',
    club: 'Free Agent',
    overall: 82,
    avatar: images.avatarMale,
    attributes: [
      { key: 'Pace', val: 88, confidence: 'High' },
      { key: 'Dribbling', val: 84, confidence: 'High' },
      { key: 'Passing', val: 77, confidence: 'Medium' },
      { key: 'Shooting', val: 73, confidence: 'Medium' },
      { key: 'Defending', val: 52, confidence: 'High' },
      { key: 'Physical', val: 79, confidence: 'Medium' },
    ],
    matchScore: 92,
    recentlyActive: true,
    videoCount: 6,
    strengths: ['Explosive acceleration', 'Strong 1v1 ability', 'Good ball control'],
    watchAreas: ['Defensive contribution', 'Decision making under pressure'],
  },
  {
    id: 'brian-mwangi',
    name: 'Brian Mwangi',
    position: 'ST',
    country: 'Kenya',
    flag: '🇰🇪',
    age: 20,
    city: 'Mombasa',
    club: 'Bandari FC Academy',
    overall: 79,
    avatar: images.avatarMale,
    attributes: [
      { key: 'Pace', val: 83, confidence: 'High' },
      { key: 'Shooting', val: 81, confidence: 'High' },
      { key: 'Dribbling', val: 78, confidence: 'Medium' },
      { key: 'Passing', val: 75, confidence: 'Medium' },
      { key: 'Physical', val: 82, confidence: 'High' },
      { key: 'Defending', val: 41, confidence: 'Medium' },
    ],
    matchScore: 84,
    recentlyActive: true,
    videoCount: 4,
    strengths: ['Clinical finishing', 'Aerial presence'],
    watchAreas: ['Link-up play', 'Work rate off the ball'],
  },
  {
    id: 'david-achieng',
    name: 'David Achieng',
    position: 'LW',
    country: 'Uganda',
    flag: '🇺🇬',
    age: 18,
    city: 'Kampala',
    club: 'Free Agent',
    overall: 76,
    avatar: images.avatarMale,
    attributes: [
      { key: 'Pace', val: 85, confidence: 'Medium' },
      { key: 'Dribbling', val: 80, confidence: 'Medium' },
      { key: 'Passing', val: 70, confidence: 'Low' },
      { key: 'Shooting', val: 68, confidence: 'Low' },
      { key: 'Defending', val: 45, confidence: 'Medium' },
      { key: 'Physical', val: 66, confidence: 'Low' },
    ],
    matchScore: 77,
    recentlyActive: true,
    videoCount: 2,
    strengths: ['Raw pace', 'Direct running'],
    watchAreas: ['End product', 'Physical development'],
  },
  {
    id: 'amara-adeyemi',
    name: 'Amara Adeyemi',
    position: 'CB',
    country: 'Nigeria',
    flag: '🇳🇬',
    age: 21,
    city: 'Lagos',
    club: 'Lagos City FC',
    overall: 81,
    avatar: images.avatarFemale,
    attributes: [
      { key: 'Defending', val: 87, confidence: 'High' },
      { key: 'Physical', val: 83, confidence: 'High' },
      { key: 'Passing', val: 74, confidence: 'Medium' },
      { key: 'Pace', val: 70, confidence: 'Medium' },
      { key: 'Dribbling', val: 62, confidence: 'Medium' },
      { key: 'Shooting', val: 41, confidence: 'Low' },
    ],
    matchScore: 71,
    recentlyActive: false,
    videoCount: 5,
    strengths: ['Aerial duels', 'Reading the game'],
    watchAreas: ['Recovery pace', 'Distribution under pressure'],
  },
  {
    id: 'kwame-boateng',
    name: 'Kwame Boateng',
    position: 'GK',
    country: 'Ghana',
    flag: '🇬🇭',
    age: 22,
    city: 'Kumasi',
    club: 'Kumasi Warriors',
    overall: 79,
    avatar: images.avatarMale,
    attributes: [
      { key: 'Reflexes', val: 85, confidence: 'High' },
      { key: 'Handling', val: 80, confidence: 'High' },
      { key: 'Aerial Ability', val: 76, confidence: 'Medium' },
      { key: 'Distribution', val: 71, confidence: 'Medium' },
      { key: 'Command of Area', val: 74, confidence: 'Medium' },
      { key: 'Kicking', val: 69, confidence: 'Low' },
    ],
    matchScore: 65,
    recentlyActive: true,
    videoCount: 3,
    strengths: ['Shot-stopping', 'Commanding presence'],
    watchAreas: ['Distribution range', 'Communication'],
  },
  {
    id: 'ibrahim-toure',
    name: 'Ibrahim Toure',
    position: 'CAM',
    country: 'Senegal',
    flag: '🇸🇳',
    age: 19,
    city: 'Dakar',
    club: 'Free Agent',
    overall: 80,
    avatar: images.avatarMale,
    attributes: [
      { key: 'Passing', val: 86, confidence: 'High' },
      { key: 'Vision', val: 84, confidence: 'Medium' },
      { key: 'Dribbling', val: 79, confidence: 'High' },
      { key: 'Shooting', val: 72, confidence: 'Medium' },
      { key: 'Pace', val: 68, confidence: 'Medium' },
      { key: 'Defending', val: 48, confidence: 'Medium' },
    ],
    matchScore: 88,
    recentlyActive: true,
    videoCount: 7,
    strengths: ['Passing range', 'Game intelligence'],
    watchAreas: ['Defensive tracking', 'Physical duels'],
  },
];

export function getPlayerById(id: string) {
  return MOCK_PLAYERS.find((p) => p.id === id);
}
