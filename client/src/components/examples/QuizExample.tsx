import { ThemeProvider } from "../ThemeProvider";
import Quiz from "../Quiz";

export default function QuizExample() {
  return (
    <ThemeProvider>
      <div className="max-w-2xl mx-auto p-4">
        <Quiz onComplete={() => console.log("Quiz completed")} />
      </div>
    </ThemeProvider>
  );
}
