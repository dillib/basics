import { ThemeProvider } from "../ThemeProvider";
import TopicLearningPage from "../TopicLearningPage";

export default function TopicLearningPageExample() {
  return (
    <ThemeProvider>
      <TopicLearningPage topicId="quantum-mechanics" />
    </ThemeProvider>
  );
}
