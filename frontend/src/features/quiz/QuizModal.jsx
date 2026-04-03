import { useEffect, useState } from "react";
import api from "../../../src/services/api";
import "./QuizModal.css";

const QuizModal = ({ partitionId, onClose }) => {

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);

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

    setScore(`${res.data.score}/${res.data.total}`);
  };

  return (
    <div className="quiz-overlay">
      <div className="quiz-modal">

        <h2 className="quiz-title">Quiz</h2>

        {score ? (
          <div className="score-box">
            <h3>Your Score</h3>
            <p>{score}</p>
            <button className="btn btn-close" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            {questions.map((q, index) => (
              <div key={q.id} className="question-card">

                <p className="question-text">
                  {index + 1}. {q.question_text}
                </p>

                <div className="options">
                  {Object.entries(q.options).map(([key, val]) => (
                    <button
                      key={key}
                      className={`option-btn ${
                        answers[q.id] === key ? "selected" : ""
                      }`}
                      onClick={() => selectAnswer(q.id, key)}
                    >
                      {key}: {val}
                    </button>
                  ))}
                </div>

              </div>
            ))}

            <div className="quiz-actions">
              <button className="btn btn-submit" onClick={handleSubmit}>
                Submit
              </button>
              <button className="btn btn-skip" onClick={onClose}>
                Skip
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default QuizModal;