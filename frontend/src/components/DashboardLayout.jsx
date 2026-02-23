import Navbar from "./Navbar";

const DashboardLayout = ({ children }) => {
  return (
    <div>
      <Navbar />
      <div style={{ padding: "20px" }}>
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;