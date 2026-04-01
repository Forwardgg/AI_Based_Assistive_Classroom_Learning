import { useEffect, useState } from "react";
import api from "../../services/api";

const ProfessorQuizView = ({ partitionId }) => {

  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const fetchQuiz = async () => {
      const res = await api.get(`/quiz/partition/${partitionId}`);
      setQuestions(res.data.questions);
    };

    fetchQuiz();
  }, [partitionId]);

  return (
    <div>
      <h3>Generated Quiz</h3>

      {questions.map(q => (
        <div key={q.id}>
          <p>{q.question_text}</p>

          {Object.entries(q.options).map(([key, val]) => (
            <p
              key={key}
              style={{
                fontWeight: q.correct === key ? "bold" : "normal",
                color: q.correct === key ? "green" : "black"
              }}
            >
              {key}: {val}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
};

export default ProfessorQuizView;