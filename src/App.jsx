import CollegeRide from "./CollegeRide.jsx";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import AuthScreens from "./auth/AuthScreens.jsx";

function AppGate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', system-ui, sans-serif",
          color: "#64748b",
          fontSize: 15,
        }}
      >
        …
      </div>
    );
  }
  return user ? <CollegeRide /> : <AuthScreens />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
