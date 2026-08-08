import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import * as profileRepository from '../repositories/profileRepository';
import type { ProfileRow, PlayerRow, ScoutRow } from '../repositories/profileRepository';

export type Role = 'player' | 'scout';

type SessionState = {
  status: 'loading' | 'signed-out' | 'signed-in';
  session: Session | null;
  profile: ProfileRow | null;
  player: PlayerRow | null;
  scout: ScoutRow | null;
  role: Role | null;
  scoutVerified: boolean;
  hydrate: (session: Session | null) => Promise<void>;
  clear: () => void;
};

const CLEARED = {
  session: null,
  profile: null,
  player: null,
  scout: null,
  role: null,
  scoutVerified: false,
};

const SIGNED_OUT = { status: 'signed-out' as const, ...CLEARED };

// The real seam a Supabase session plugs into: hydrate() is called once at
// boot (from _layout.tsx) and again on every auth state change. Nothing
// outside this store writes role/scoutVerified directly anymore — they're
// derived from the profiles/players/scouts rows, never set by a screen.
export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  ...CLEARED,
  hydrate: async (session) => {
    if (!session) {
      set(SIGNED_OUT);
      return;
    }
    try {
      const profile = await profileRepository.getMyProfile(session.user.id);
      const role = profile.role as Role;
      if (role === 'scout') {
        const scout = await profileRepository.getMyScout(session.user.id);
        set({
          status: 'signed-in',
          session,
          profile,
          player: null,
          scout,
          role,
          scoutVerified: scout?.verification_status === 'verified',
        });
      } else {
        const player = await profileRepository.getMyPlayer(session.user.id);
        set({ status: 'signed-in', session, profile, player, scout: null, role, scoutVerified: false });
      }
    } catch {
      set(SIGNED_OUT);
    }
  },
  clear: () => set(SIGNED_OUT),
}));
