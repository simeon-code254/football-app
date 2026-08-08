import { MOCK_PLAYERS } from './mockPlayers';

export type ApplicantStatus = 'pending' | 'shortlisted' | 'accepted' | 'rejected';

export type MockApplicant = {
  playerId: string;
  status: ApplicantStatus;
};

export type MockTrial = {
  id: string;
  title: string;
  club: string;
  location: string;
  ageRange: string;
  position: string;
  trialDate: string;
  deadline: string;
  description: string;
  applicants: MockApplicant[];
};

export const MOCK_TRIALS: MockTrial[] = [
  {
    id: 't1',
    title: 'U21 Winger Trial',
    club: 'Nairobi City FC',
    location: 'Nairobi, Kenya',
    ageRange: '18–21',
    position: 'LW / RW',
    trialDate: '24 August',
    deadline: '20 August',
    description: 'Open trial for wide attacking players. Bring boots for both grass and artificial turf.',
    applicants: [
      { playerId: 'kevin-otieno', status: 'shortlisted' },
      { playerId: 'david-achieng', status: 'pending' },
      { playerId: 'ibrahim-toure', status: 'pending' },
    ],
  },
  {
    id: 't2',
    title: 'Goalkeeper Recruitment',
    club: 'Kisumu Warriors',
    location: 'Kisumu, Kenya',
    ageRange: '19–24',
    position: 'GK',
    trialDate: '2 September',
    deadline: '21 August',
    description: 'Looking for a first-team goalkeeper ahead of the new season.',
    applicants: [{ playerId: 'kwame-boateng', status: 'accepted' }],
  },
];

export function getTrialById(id: string) {
  return MOCK_TRIALS.find((t) => t.id === id);
}

export function applicantPlayer(a: MockApplicant) {
  return MOCK_PLAYERS.find((p) => p.id === a.playerId)!;
}

// The demo player persona ("Marcus Johnson" elsewhere in the app) isn't one
// of the MOCK_PLAYERS rows — those represent the pool a scout browses. This
// tracks which trials "you" (the logged-in player) have applied to or been
// invited to, independent of that pool.
export type MyApplicationStatus = ApplicantStatus | 'invited';

export type MyApplication = {
  trialId: string;
  status: MyApplicationStatus;
  appliedAt: string;
};

export const MY_APPLICATIONS: MyApplication[] = [
  { trialId: 't2', status: 'invited', appliedAt: '2 days ago' },
];

export function getMyApplication(trialId: string) {
  return MY_APPLICATIONS.find((a) => a.trialId === trialId);
}
