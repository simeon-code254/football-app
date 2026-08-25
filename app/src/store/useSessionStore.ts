import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import * as profileRepository from '../repositories/profileRepository';
import type { ProfileRow, PlayerRow, ScoutRow } from '../repositories/profileRepository';
import type { ClubRow } from '../repositories/clubsRepository';
import * as clubsRepository from '../repositories/clubsRepository';

export type Role = 'player' | 'scout' | 'club';

type SessionState = {
  status: 'loading' | 'signed-out' | 'signed-in';
  session: Session | null;
  profile: ProfileRow | null;
  player: PlayerRow | null;
  scout: ScoutRow | null;
  club: ClubRow | null;
  role: Role | null;
  /**
   * True when the signed-in account has cleared its ID check. Both scouts and
   * clubs are ID-checked, and everything downstream (seeing minors, messaging,
   * posting trials) gates on the same flag, so one name covers both rather
   * than every consumer having to ask which role it is looking at.
   */
  scoutVerified: boolean;
  hydrate: (session: Session | null) => Promise<void>;
  clear: () => void;
};

const CLEARED = {
  session: null,
  profile: null,
  player: null,
  scout: null,
  club: null,
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
      // Admin has no players/scouts/clubs row and no UI in this app -- it
      // previously fell through to the player branch ("not scout = player")
      // and 406'd fetching a players row that was never created for it.
      // Admins use the separate web dashboard.
      if (profile.role !== 'player' && profile.role !== 'scout' && profile.role !== 'club') {
        set(SIGNED_OUT);
        return;
      }
      const role = profile.role as Role;
      if (role === 'scout') {
        const scout = await profileRepository.getMyScout(session.user.id);
        set({
          status: 'signed-in',
          session,
          profile,
          player: null,
          scout,
          club: null,
          role,
          scoutVerified: scout?.verification_status === 'verified',
        });
      } else if (role === 'club') {
        const club = await clubsRepository.getMyClub(session.user.id);
        set({
          status: 'signed-in',
          session,
          profile,
          player: null,
          scout: null,
          club,
          role,
          scoutVerified: club?.verification_status === 'verified',
        });
      } else {
        const player = await profileRepository.getMyPlayer(session.user.id);
        set({
          status: 'signed-in',
          session,
          profile,
          player,
          scout: null,
          club: null,
          role,
          scoutVerified: false,
        });
      }
    } catch {
      set(SIGNED_OUT);
    }
  },
  clear: () => set(SIGNED_OUT),
}));
