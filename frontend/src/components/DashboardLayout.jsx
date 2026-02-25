import Navbar from "./Navbar";

const DashboardLayout = ({ children }) => {
  return (
    <div>
      <Navbar />
      <div style={{ padding: "0.1rem" }}>
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;