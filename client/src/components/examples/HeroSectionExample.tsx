import { ThemeProvider } from "../ThemeProvider";
import HeroSection from "../HeroSection";

export default function HeroSectionExample() {
  return (
    <ThemeProvider>
      <HeroSection 
        onSearch={(query) => console.log("Search:", query)}
        onTopicClick={(topic) => console.log("Topic clicked:", topic)}
      />
    </ThemeProvider>
  );
}
