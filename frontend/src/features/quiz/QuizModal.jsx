import { useEffect, useState } from "react";
import api from "../../../src/services/api";

const QuizModal = ({ partitionId, onClose }) => {

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  // =========================
  // FETCH QUIZ
  // =========================
  useEffect(() => {

    const fetchQuiz = async () => {
      const res = await api.get(`/quiz/partition/${partitionId}`);
      setQuestions(res.data.questions);
    };

    fetchQuiz();

  }, [partitionId]);

  // =========================
  // SELECT ANSWER
  // =========================
  const selectAnswer = (qId, option) => {
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async () => {

    const formatted = Object.entries(answers).map(([qId, opt]) => ({
      question_id: parseInt(qId),
      selected_option: opt
    }));

    const res = await api.post("/quiz/submit", {
      answers: formatted
    });

    alert(`Score: ${res.data.score}/${res.data.total}`);

    onClose();
  };

  return (
    <div className="quiz-modal">

      <h2>Quiz</h2>

      {questions.map(q => (
        <div key={q.id}>
          <p>{q.question_text}</p>

          {Object.entries(q.options).map(([key, val]) => (
            <button
              key={key}
              onClick={() => selectAnswer(q.id, key)}
            >
              {key}: {val}
            </button>
          ))}
        </div>
      ))}

      <button onClick={handleSubmit}>Submit</button>
      <button onClick={onClose}>Skip</button>

    </div>
  );
};

export default QuizModal;