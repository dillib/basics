import { ThemeProvider } from "../ThemeProvider";
import Header from "../Header";

export default function HeaderExample() {
  return (
    <ThemeProvider>
      <Header 
        isLoggedIn={false}
        onLogin={() => console.log("Login triggered")}
        onLogout={() => console.log("Logout triggered")}
      />
    </ThemeProvider>
  );
}
