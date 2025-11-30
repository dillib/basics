import { useParams } from "wouter";
import TopicLearningPage from "@/components/TopicLearningPage";

export default function TopicPage() {
  const params = useParams<{ slug: string }>();
  
  return <TopicLearningPage topicId={params.slug} />;
}
