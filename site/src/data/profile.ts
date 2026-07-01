export interface SkillGroup {
  icon: string;
  title: string;
  tags: string[];
}

export interface Project {
  id: string;
  emoji: string;
  title: string;
  description: string;
  repoUrl: string;
  media: { kind: 'screenshot' | 'icon'; src: string; alt: string };
  tags: string[];
}

export interface ContactLink {
  icon: string;
  label: string;
  href: string;
}

export interface Profile {
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  pills: string[];
  skillGroups: SkillGroup[];
  projects: Project[];
  contactLinks: ContactLink[];
}

export const profile: Profile = {
  name: 'Tianhao Zhou',
  handle: '@tianhaoz95',
  avatarUrl: 'https://github.com/tianhaoz95.png',
  bio: "Building tools across terminal & dev tooling, browser AI, and AI/ML research — see the projects below.",
  pills: [
    '🚀 Ask me about: inference engines',
    '🤖 Ask me about: RLVR',
    '⚡ A boba a day keeps bugs away',
  ],
  skillGroups: [
    {
      icon: '🛠️',
      title: 'Systems & backend',
      tags: ['Node.js', 'Express', 'WebSockets', 'PTY / terminals'],
    },
    {
      icon: '🧠',
      title: 'Browser AI & ML',
      tags: ['Transformers.js', 'MediaPipe', 'Tesseract.js (OCR)', 'on-device inference'],
    },
    {
      icon: '🎨',
      title: 'Frontend',
      tags: ['TypeScript', 'Astro', 'Vite'],
    },
    {
      icon: '☁️',
      title: 'Infra & hosting',
      tags: ['Firebase', 'GitHub Actions', 'GitHub Pages'],
    },
  ],
  projects: [
    {
      id: 'meowtrix',
      emoji: '🐾',
      title: 'Meowtrix',
      description:
        "Remote vibe engineering tool — a browser-based workspace with tiling split panes, each pane holding a PTY-backed terminal or an embedded browser. Shells live on the server, so refreshes and device switches don't kill your work.",
      repoUrl: 'https://github.com/tianhaoz95/meowtrix',
      media: {
        kind: 'screenshot',
        src: 'https://tianhaoz95.github.io/meowtrix/assets/screenshot-dark.png',
        alt: 'Meowtrix screenshot',
      },
      tags: ['terminal', 'remote dev', 'Node.js'],
    },
    {
      id: 'zerog-tools',
      emoji: '⚡',
      title: 'ZeroG Toolbox',
      description:
        '35+ free, privacy-first utilities that run 100% in your browser — AI passport photos, audio transcription, OCR, file encryption, and more. No uploads, no servers, fully private.',
      repoUrl: 'https://github.com/tianhaoz95/zerog-tools',
      media: {
        kind: 'icon',
        src: 'https://zerog-toolbox.web.app/favicon.svg',
        alt: 'ZeroG Toolbox icon',
      },
      tags: ['browser AI', 'privacy-first', 'Vite'],
    },
    {
      id: 'study',
      emoji: '📚',
      title: 'Catpuccino.ai',
      description:
        'A personal AI/ML tech blog — deep dives into frontier research papers and open-source projects, with interactive visualizations and companion apps.',
      repoUrl: 'https://github.com/tianhaoz95/study',
      media: {
        kind: 'icon',
        src: 'https://heji-study.web.app/favicon.svg',
        alt: 'Catpuccino.ai icon',
      },
      tags: ['AI/ML research', 'blog', 'Astro'],
    },
  ],
  contactLinks: [
    { icon: '🐙', label: 'GitHub', href: 'https://github.com/tianhaoz95' },
    { icon: '✉️', label: 'Email', href: 'mailto:jacksonzhou666@gmail.com' },
    { icon: '🐦', label: 'Twitter', href: 'https://twitter.com/TheSWE2' },
    { icon: '✍️', label: 'Medium', href: 'https://medium.com/@tianhaozhou' },
    { icon: '▶️', label: 'YouTube', href: 'https://www.youtube.com/channel/UCY13XGU7-3mYz2n1NzV4oGw' },
    { icon: '👽', label: 'Reddit', href: 'https://www.reddit.com/user/jacksonz666/' },
    { icon: '🎮', label: 'Twitch', href: 'https://www.twitch.tv/jacksonzhou666' },
  ],
};
