// frontend/src/features/users/pages/Users.jsx
import { useEffect, useState } from "react";
import API from "../../../services/api";

function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    API.get("/users") // FIXED
      .then((res) => {
        setUsers(res.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Users</h1>

      {users.map((user) => (
        <div key={user.id}>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
          <p>Role: {user.role}</p>
          <hr />
        </div>
      ))}
    </div>
  );
}

export default Users;