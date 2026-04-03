import { useEffect, useState } from "react";
import api from "../../services/api";
import "./ProfessorQuizView.css";

const ProfessorQuizView = ({ partitionId, onClose }) => {

  const [questions, setQuestions] = useState([]);

  useEffect(() => {
  const fetchQuiz = async () => {
    try {
      const res = await api.get(`/quiz/partition/${partitionId}`);
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error("Quiz not found");
      setQuestions([]);
    }
  };

  fetchQuiz();
}, [partitionId]);

  return (
  <div className="quiz-overlay">
    <div className="quiz-modal large">

      <h2 className="quiz-title">Generated Quiz</h2>

      {questions.map((q, index) => (
        <div key={q.id} className="question-card">

          <p className="question-text">
            {index + 1}. {q.question_text}
          </p>

          <div className="options-list">
            {Object.entries(q.options).map(([key, val]) => (
              <div
                key={key}
                className={`option ${
                  q.correct === key ? "correct" : ""
                }`}
              >
                {key}: {val}
              </div>
            ))}
          </div>

        </div>
      ))}

      <button className="btn btn-close" onClick={onClose}>
        Close
      </button>

    </div>
  </div>
);
};

export default ProfessorQuizView;