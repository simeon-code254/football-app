import { Redirect } from 'expo-router';

// The club's Messages tab.
//
// Conversations are modelled as (scout_id, player_id) in the database, and a
// club account is a scout-side party for that purpose -- the same table, the
// same RLS, the same thread UI. So this points at the existing screen rather
// than cloning ~450 lines of realtime subscription, cursor pagination and
// attachment handling that would then drift from it.
//
// If clubs ever need something the scout thread does not do -- assigning a
// thread to a named scout on the roster, say -- this becomes a real screen.
// Until then a second copy is a liability, not a feature.
export default function ClubMessages() {
  return <Redirect href="/messages" />;
}
