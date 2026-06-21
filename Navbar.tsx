"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Leaf, Flame, Award, Sun, Moon, LogOut, Menu, X } from "lucide-react";
import styles from "./Navbar.module.css";

interface NavbarProps {
  userPoints?: number;
  userStreak?: number;
}

export default function Navbar({ userPoints, userStreak }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("Eco User");
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState("Eco-Novice");
  const [theme, setTheme] = useState("dark");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Load theme preference
    const savedTheme = localStorage.getItem("ecotrack_theme") || "dark";
    setTheme(savedTheme);
    document.body.setAttribute("data-theme", savedTheme);

    // Load session user details
    const session = localStorage.getItem("ecotrack_session");
    if (session) {
      const parsed = JSON.parse(session);
      setUserName(parsed.name);
      setPoints(userPoints !== undefined ? userPoints : (parsed.points || 0));
      setStreak(userStreak !== undefined ? userStreak : (parsed.streak || 0));
      
      // Calculate level
      const p = userPoints !== undefined ? userPoints : (parsed.points || 0);
      if (p >= 1000) setLevel("Eco-Warrior");
      else if (p >= 500) setLevel("Green Guardian");
      else if (p >= 250) setLevel("Habit Builder");
      else setLevel("Eco-Novice");
    }
  }, [userPoints, userStreak]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("ecotrack_theme", newTheme);
    document.body.setAttribute("data-theme", newTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem("ecotrack_session");
    router.push("/");
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Calculator", path: "/calculator" },
    { label: "AI Coach", path: "/coach" },
    { label: "Action Logs", path: "/actions" },
    { label: "Eco-Challenges", path: "/challenges" },
    { label: "Ed Hub", path: "/education" },
    { label: "Reports", path: "/reports" }
  ];

  return (
    <nav className={`${styles.nav} glass-panel`}>
      <div className={styles.navContainer}>
        <div className={styles.logo} onClick={() => router.push("/dashboard")}>
          <Leaf className={styles.logoIcon} />
          <span>EcoTrack</span>
        </div>

        <div className={`${styles.navLinks} ${menuOpen ? styles.mobileOpen : ""}`}>
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                setMenuOpen(false);
                router.push(item.path);
              }}
              className={`${styles.navLink} ${pathname === item.path ? styles.active : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={styles.userProfile}>
          <div className={styles.themeToggle} onClick={toggleTheme} title="Toggle Theme">
            {theme === "dark" ? <Sun size={18} className={styles.sunIcon} /> : <Moon size={18} className={styles.moonIcon} />}
          </div>

          <div className={styles.statBadge} title="Your Daily Active Streak">
            <Flame size={16} className={styles.flameIcon} />
            <span>{streak}d</span>
          </div>

          <div className={styles.statBadge} title="Your Sustainability Points">
            <Award size={16} className={styles.awardIcon} />
            <span>{points} pts</span>
          </div>

          <div className={styles.userInfo}>
            <span className={styles.userName}>{userName}</span>
            <span className={styles.userLevel}>{level}</span>
          </div>

          <button onClick={handleLogout} className={styles.logoutBtn} title="Log Out">
            <LogOut size={16} />
          </button>

          <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuBtn}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
