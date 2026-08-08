import { images } from '../constants/images';

export type MockComment = {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
};

export type MockReel = {
  id: string;
  video: string; // thumbnail/placeholder image standing in for a video source
  creatorName: string;
  creatorAvatar: string;
  badge: string; // e.g. "CAM · 82 OVR"
  caption: string;
  hashtags: string;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  shareCount: number;
  liked: boolean;
  saved: boolean;
  comments: MockComment[];
};

// Matches the video_likes/video_saves/video_comments schema shape (this is
// what a real feed query — ordered videos joined to engagement counts —
// will return once wired up).
export const MOCK_REELS: MockReel[] = [
  {
    id: 'r1',
    video: images.reelsClip,
    creatorName: 'marcus_johnson',
    creatorAvatar: images.avatarMale,
    badge: 'CAM · 82 OVR',
    caption: 'Weekend hat-trick vs Academy FC 🔥',
    hashtags: '#freekick #goals #matobev',
    likeCount: 2400,
    commentCount: 186,
    saveCount: 92,
    shareCount: 54,
    liked: false,
    saved: false,
    comments: [
      { id: 'c1', author: 'David Okafor', avatar: images.avatarMale, text: 'That finish though 🔥', time: '2h' },
      { id: 'c2', author: 'Amara Adeyemi', avatar: images.avatarFemale, text: 'Great vision on the second goal', time: '1h' },
    ],
  },
  {
    id: 'r2',
    video: images.onboardSlide2,
    creatorName: 'kevin.otieno',
    creatorAvatar: images.avatarMale,
    badge: 'RW · 82 OVR',
    caption: 'Training session — working on that first touch',
    hashtags: '#training #skills',
    likeCount: 1100,
    commentCount: 54,
    saveCount: 31,
    shareCount: 20,
    liked: false,
    saved: false,
    comments: [{ id: 'c1', author: 'Ibrahim Toure', avatar: images.avatarMale, text: 'Solid work rate', time: '5h' }],
  },
  {
    id: 'r3',
    video: images.authHero,
    creatorName: 'kwame_boateng',
    creatorAvatar: images.avatarMale,
    badge: 'GK · 79 OVR',
    caption: 'Clean sheet weekend 🧤',
    hashtags: '#goalkeeper #cleansheet',
    likeCount: 860,
    commentCount: 23,
    saveCount: 18,
    shareCount: 8,
    liked: false,
    saved: false,
    comments: [],
  },
];
