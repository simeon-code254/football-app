export type NotificationType =
  | 'ai_analysis_complete'
  | 'new_message'
  | 'trial_invitation'
  | 'trial_status_change'
  | 'scout_verified'
  | 'new_scout_view'
  | 'system';

export type MockNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

// Matches the `notifications` table shape (type/title/body/read_at) — this
// is the data the real query will return once wired up.
export const PLAYER_NOTIFICATIONS: MockNotification[] = [
  { id: 'n1', type: 'new_scout_view', title: 'New profile view', body: '3 scouts viewed your profile this week.', time: '2h', read: false },
  { id: 'n2', type: 'trial_invitation', title: 'Trial invitation', body: 'Kisumu Warriors invited you to Goalkeeper Recruitment.', time: '1d', read: false },
  { id: 'n3', type: 'ai_analysis_complete', title: 'Analysis complete', body: 'Your Pace rating improved by +3 after your latest upload.', time: '2d', read: true },
  { id: 'n4', type: 'new_message', title: 'New message', body: 'Academy FC scout sent you a message.', time: '3d', read: true },
];

export const SCOUT_NOTIFICATIONS: MockNotification[] = [
  { id: 'n1', type: 'system', title: 'New match', body: '12 new players match your scouting preferences.', time: '1h', read: false },
  { id: 'n2', type: 'ai_analysis_complete', title: 'New highlight', body: 'Kevin Otieno uploaded a new highlight.', time: '4h', read: false },
  { id: 'n3', type: 'trial_status_change', title: 'New applicant', body: 'Your trial "U21 Winger Trial" received 5 new applications.', time: '1d', read: false },
  { id: 'n4', type: 'scout_verified', title: 'Verification approved', body: 'Your scout account has been verified.', time: '3d', read: true },
];
