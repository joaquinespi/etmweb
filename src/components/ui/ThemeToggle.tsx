import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setMounted(true);

    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const html = document.documentElement;

    if (savedTheme) {
      setTheme(savedTheme);
      html.classList.toggle("dark", savedTheme === "dark");
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = prefersDark ? "dark" : "light";
    setTheme(initialTheme);
    html.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const newTheme = theme === "light" ? "dark" : "light";

    setTheme(newTheme);
    html.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  if (!mounted) {
    return <button aria-label="Cambiar tema" className="w-10 h-10" />;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Cambiar tema"
      className="p-1 rounded-full border-2 border-gray-900 bg-surface-offset hover:bg-surface-offset-2 transition-colors dark:border-yellow-200"
    >
      {theme === "dark" ? (
        <svg fill="none" stroke="currentColor" className="w-5 h-5 text-yellow-200" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364-.707-.707M6.343 6.343l-.707-.707m12.728 0-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0" strokeWidth={2}/></svg>
      ) : (
          <svg fill="none" stroke="currentColor" className="w-5 h-5 text-black" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9.003 9.003 0 0 0 12 21a9 9 0 0 0 8.354-5.646" strokeWidth={2}/></svg>
      )}
    </button>
  );
}