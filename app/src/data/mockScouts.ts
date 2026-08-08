import { images } from '../constants/images';

export type MockScout = {
  id: string;
  name: string;
  organization: string;
  avatar: string;
  verified: boolean;
};

// The player-side counterpart to MOCK_PLAYERS — scouts a player can receive
// messages from. Matches the `scouts` table shape (organization, verified).
export const MOCK_SCOUTS: MockScout[] = [
  { id: 'scout-simeon', name: 'Simeon Anyal', organization: 'Matobev Talent Partners', avatar: images.avatarMale, verified: true },
  { id: 'scout-grace', name: 'Grace Mwikali', organization: 'Academy FC', avatar: images.avatarFemale, verified: true },
];

export function getScoutById(id: string) {
  return MOCK_SCOUTS.find((s) => s.id === id);
}
