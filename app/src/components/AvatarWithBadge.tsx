import { View, StyleProp, ViewStyle } from 'react-native';
import { InitialsAvatar } from './InitialsAvatar';
import { VerificationBadge, VerificationRole } from './VerificationBadge';

// An avatar with the verification hexagon clipped to its lower-right corner,
// as canvas screen 19 draws every verified correspondent:
//
//   <div avatar 38px> ES
//     <div class="mv mv-scout" style="position:absolute;bottom:-4px;right:-5px;
//                                      width:16px;height:18px">
//       <div class="mv-in"><div class="logoG" style="width:64%"></div></div>
//
// At 16px wide the badge is below VerificationBadge's MARK_BELOW threshold, so
// it draws the gold mark rather than a role glyph -- which is the point: a
// magnifier at 5px is mud, the Matobev silhouette still reads.
//
// The badge is only ever rendered for a role that has actually been verified.
// An unverified scout gets no badge at all rather than a greyed one, because a
// greyed badge still says "badge" at a glance, and the whole value of the mark
// is that it cannot be worn without earning it.
export function AvatarWithBadge({
  name,
  uri,
  size = 38,
  role,
  style,
}: {
  name: string | null | undefined;
  uri?: string | null;
  size?: number;
  /** Omit or pass null for an unverified account -- no badge is drawn. */
  role?: VerificationRole | null;
  style?: StyleProp<ViewStyle>;
}) {
  const badgeWidth = Math.round(size * (16 / 38));

  return (
    <View style={[{ width: size, height: size }, style]}>
      <InitialsAvatar name={name} uri={uri} size={size} />
      {role && (
        <View style={{ position: 'absolute', bottom: -4, right: -5 }}>
          <VerificationBadge role={role} size={badgeWidth} glyph="mark" />
        </View>
      )}
    </View>
  );
}
