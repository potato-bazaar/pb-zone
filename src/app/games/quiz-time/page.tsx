import { QuizTimeApp } from "@/components/quiz/QuizTimeApp";

/** Its own route (static segments win over `[id]`), so the quiz's first load doesn't ship the other games. */
export default function QuizTimePage() {
  return <QuizTimeApp />;
}
