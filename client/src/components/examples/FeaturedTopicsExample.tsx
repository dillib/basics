import { ThemeProvider } from "../ThemeProvider";
import FeaturedTopics from "../FeaturedTopics";

export default function FeaturedTopicsExample() {
  return (
    <ThemeProvider>
      <FeaturedTopics 
        onTopicClick={(topicId) => console.log("Topic clicked:", topicId)}
      />
    </ThemeProvider>
  );
}
