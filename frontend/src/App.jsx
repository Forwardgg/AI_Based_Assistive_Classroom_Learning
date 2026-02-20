import { useEffect, useState } from "react";
import API from "./services/api";

function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    API.get("/api/test")
      .then((res) => {
        setMessage(res.data.message);
      })
      .catch((err) => {
        console.error(err);
        setMessage("Error connecting to backend");
      });
  }, []);

  return (
    <div>
      <h1>{message}</h1>
    </div>
  );
}

export default App;
