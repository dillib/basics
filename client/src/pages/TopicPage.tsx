import { useParams } from "wouter";
import TopicLearningPage from "@/components/TopicLearningPage";

export default function TopicPage() {
  const params = useParams<{ id: string }>();
  
  return <TopicLearningPage topicId={params.id} />;
}
