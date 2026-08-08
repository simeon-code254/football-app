import { create } from 'zustand';

export type Role = 'player' | 'scout';

type SessionState = {
  role: Role;
  scoutVerified: boolean;
  setRole: (role: Role) => void;
  setScoutVerified: (verified: boolean) => void;
};

// No backend/auth yet — this is the seam where a real session (Supabase
// user + role + verification status) will plug in later. Role is set at
// signup/login; scoutVerified is mocked so the verification-gated UI
// (messaging, trial creation) has something real to branch on. A freshly
// signed-up scout starts unverified (realistic — needs admin review); the
// Login screen's demo role toggle sets a returning scout as already
// verified, so both states are reachable for testing.
export const useSessionStore = create<SessionState>((set) => ({
  role: 'player',
  scoutVerified: true,
  setRole: (role) => set({ role }),
  setScoutVerified: (verified) => set({ scoutVerified: verified }),
}));
