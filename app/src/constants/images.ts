// Verified Unsplash photos with an African football setting (checked via the
// photo's own page — not guessed IDs). Used in place of the original design
// mockup's generic stock photography per the request to ground the app in an
// African context.
const u = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;

export const images = {
  // Action / scene photography
  splashHero: u('photo-1641280173256-0ac1b2f4cd78'), // player kicking ball on a field
  onboardSlide1: u('photo-1751394216135-8d99807a88a8'), // player on green field
  onboardSlide2: u('photo-1751394210161-fb7e64c0ea1a'), // player dribbling — motion, pairs with "AI analyzes your skills"
  onboardSlide3: u('photo-1652664845183-c6083bc286fc'), // group of young men — pairs with "connect with scouts"
  welcomeHero: u('photo-1751394215726-31a4972d3835'), // player standing on field
  authHero: u('photo-1652665314612-c48e10a01598'), // players on the beach, Conakry, Guinea — used on Login/Role Select headers
  reelsClip: u('photo-1751394215141-30fc819f0018'), // player on field, used as the Reels placeholder clip

  // Portraits (avatars) — shot in Lagos, Nigeria and from a Nigerian-portrait set
  avatarMale: u('photo-1531299983330-093763e1d963'),
  avatarFemale: u('photo-1602342323893-b11f757957c9'),
} as const;
