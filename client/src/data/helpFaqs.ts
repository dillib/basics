// Help Center FAQs. Plain data (no React), so the server can render the
// same questions into the crawlable /help snapshot (server/seo.ts).

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQCategory {
  id: string;
  title: string;
  /** lucide-react icon name, mapped to a component in HelpPage. */
  icon: string;
  description: string;
  faqs: FAQItem[];
}

export const faqCategories: FAQCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "BookOpen",
    description: "Learn the basics of using BasicsTutor",
    faqs: [
      {
        question: "What is BasicsTutor?",
        answer: "BasicsTutor is an AI-powered learning platform that teaches complex topics by breaking them down into first principles. We help you understand concepts from the ground up, building a solid foundation of knowledge.",
      },
      {
        question: "How do I create an account?",
        answer: "Click the 'Sign in' button in the top right corner and continue with your Google account. Once signed in, you'll have access to your dashboard and can start learning.",
      },
      {
        question: "What is first principles learning?",
        answer: "First principles learning means breaking down complex topics into their most fundamental truths, then building understanding from there. Instead of memorizing facts, you learn the 'why' behind concepts, leading to deeper and more lasting understanding.",
      },
      {
        question: "How do I start learning a topic?",
        answer: "Go to the Topics page and either browse existing topics or generate a new one. Enter any topic you want to learn, and our AI will break it down into fundamental principles for you.",
      },
    ],
  },
  {
    id: "topics-learning",
    title: "Topics & Learning",
    icon: "GraduationCap",
    description: "Understanding how topics and learning work",
    faqs: [
      {
        question: "How are topics generated?",
        answer: "Our AI (powered by Google Gemini) analyzes your topic request and creates a structured learning path. It identifies 4-6 core principles, writes detailed explanations with real-world analogies, and generates quizzes to test your understanding.",
      },
      {
        question: "Can I generate any topic?",
        answer: "Yes! You can generate topics on almost anything - from quantum physics to cooking techniques, from philosophy to programming. Our AI adapts to create appropriate first-principles breakdowns for any subject.",
      },
      {
        question: "How long does it take to learn a topic?",
        answer: "Each topic has an estimated learning time shown on the card (typically 20-60 minutes). However, you can learn at your own pace. Progress is saved automatically, so you can continue where you left off.",
      },
      {
        question: "What are principles?",
        answer: "Principles are the fundamental concepts that make up a topic. Each principle includes a detailed explanation, a real-world analogy to help you understand, and key takeaways. They're ordered from most basic to more advanced.",
      },
      {
        question: "How do quizzes work?",
        answer: "After learning the principles, you can take a quiz to test your understanding. Quizzes have 5 multiple-choice questions based on the principles you learned. Each question includes an explanation of the correct answer.",
      },
    ],
  },
  {
    id: "billing-pricing",
    title: "Pricing",
    icon: "CreditCard",
    description: "Is it free, and will it stay free?",
    // Pricing isn't decided yet: these answers intentionally quote no plans
    // or prices. Keep in step with section 3 of the Terms of Service.
    faqs: [
      {
        question: "Is BasicsTutor really free?",
        answer: "Yes. Right now everything on BasicsTutor is free: every topic, quiz, and animated visual. There's nothing to buy and no payment details to enter.",
      },
      {
        question: "Will it always be free?",
        answer: "We may add optional paid features in the future. If we do, we'll announce them in advance, and you'll never be charged unless you explicitly choose to buy something. Join the waitlist on the homepage to hear first.",
      },
      {
        question: "Do I need a credit card to sign up?",
        answer: "No. Creating an account and learning are free, and we don't ask for payment details.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Settings",
    icon: "Settings",
    description: "Managing your account",
    faqs: [
      {
        question: "How do I access my dashboard?",
        answer: "Once signed in, click 'Dashboard' in the navigation menu. Your dashboard shows your learning progress, topics you've started, and quiz scores.",
      },
      {
        question: "How is my progress tracked?",
        answer: "Your progress is automatically saved as you learn. We track which principles you've completed and your quiz scores. Progress syncs across devices when you're signed in.",
      },
      {
        question: "Can I delete my account?",
        answer: "Yes, you can request account deletion by contacting us at support@basicstutor.com. We'll process your request and delete all your data within 30 days.",
      },
      {
        question: "Is my data secure?",
        answer: "Yes, we take security seriously. Your data is encrypted, we use secure authentication through Google Sign-In, and we never share your personal information with third parties. See our Privacy Policy for details.",
      },
    ],
  },
];
