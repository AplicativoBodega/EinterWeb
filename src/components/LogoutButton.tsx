import { useAuth } from "../context/AuthContext";

const LogoutButton = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="button logout"
    >
      Log Out
    </button>
  );
};

export default LogoutButton;