// About page copy. Plain data so the server renders the same text into the
// crawlable /about snapshot (server/seo.ts). Keep it literally true: this is
// the page that tells readers (and search engines) who is behind the site and
// how lessons are made.

export const FOUNDER = {
  name: "Pranav Tej",
  title: "Founder, BasicsTutor",
  note: [
    "I spent years “learning” things I never actually understood — memorizing enough to pass, then forgetting it a week later.",
    "The stuff that finally stuck was always the stuff someone broke down to its fundamentals, until it just made sense. BasicsTutor is the tool I wish I’d had.",
    "Type in anything — a concept from work, something your kid asked, a topic you’ve avoided for years — and it rebuilds it from first principles until it clicks.",
  ],
};

export const HOW_LESSONS_ARE_MADE: { title: string; body: string }[] = [
  {
    title: "Someone names a topic",
    body: "A reader types a question, or our daily job picks a subject people are searching for. Lessons come in three levels: kids, teens and adults.",
  },
  {
    title: "It's researched on the web",
    body: "Before writing, an AI research step searches the web for current, sourced facts about the exact subject. Newer lessons list those sources at the end, so you can check them yourself.",
  },
  {
    title: "AI writes it from first principles",
    body: "An AI model writes the lesson: the few fundamental truths the topic rests on, each derived rather than asserted, with an analogy, key takeaways and, where it helps, practical steps.",
  },
  {
    title: "A second pass fact-checks it",
    body: "A separate AI review checks every principle against the research and scores its confidence. That score is shown on the lesson.",
  },
  {
    title: "It's checked before anyone sees it",
    body: "Children use BasicsTutor, so every request and every new lesson is screened: nothing sexual, graphic, crude, dangerous or unsuitable for its age level, no slang, and no low-confidence facts. Anything that doesn't pass is held back for a person to review instead of being published.",
  },
  {
    title: "Readers keep it honest",
    body: "Every lesson has a “Was this helpful?” vote. Lessons readers flag as wrong, outdated or confusing are re-researched each night and rewritten only if the complaints hold up. The previous version is always kept.",
  },
];

export const LIMITS = [
  "Lessons are written with AI and can contain mistakes. If you spot one, flag it on the lesson or tell us.",
  "Lessons explain how things work. They are not medical, financial or legal advice.",
  "BasicsTutor is free while it's early.",
];
