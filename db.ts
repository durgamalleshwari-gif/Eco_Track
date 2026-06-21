import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "src/lib/db.json");

export interface UserProfile {
  location: string;
  transportation: string; // e.g. "car-petrol", "electric", "public", "none"
  diet: string;           // e.g. "meat-heavy", "average", "vegetarian", "vegan"
  electricity: number;    // monthly kWh
  shopping: string;       // e.g. "low", "medium", "high"
  waste: string;          // e.g. "low", "average", "high"
}

export interface User {
  email: string;
  password?: string;
  name: string;
  points: number;
  streak: number;
  lastActiveDate: string;
  onboardingComplete: boolean;
  profile: UserProfile;
  badges: string[];
  monthlyTarget: number;
}

export interface FootprintEntry {
  email: string;
  date: string;
  transport: number; // kg CO2
  energy: number;    // kg CO2
  food: number;      // kg CO2
  shopping: number;  // kg CO2
  waste: number;     // kg CO2
  total: number;     // kg CO2
}

export interface HabitLog {
  email: string;
  actionId: string;
  date: string;
  pointsEarned: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  participants: number;
  daysLeft: number;
}

export interface LeaderboardEntry {
  name: string;
  points: number;
  streak: number;
  level: string;
}

export interface DBData {
  users: User[];
  footprints: FootprintEntry[];
  habitsLog: HabitLog[];
  challenges: Challenge[];
  leaderboard: LeaderboardEntry[];
}

// Read database
export function readDB(): DBData {
  try {
    if (!fs.existsSync(dbPath)) {
      // Create with default template if not exists
      const defaultData: DBData = {
        users: [],
        footprints: [],
        habitsLog: [],
        challenges: [],
        leaderboard: []
      };
      fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2), "utf8");
      return defaultData;
    }
    const fileContent = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading database:", error);
    return {
      users: [],
      footprints: [],
      habitsLog: [],
      challenges: [],
      leaderboard: []
    };
  }
}

// Write database
export function writeDB(data: DBData): void {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing database:", error);
  }
}

// Helper: Get user by email
export function getUserByEmail(email: string): User | undefined {
  const db = readDB();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

// Helper: Save user
export function saveUser(user: User): void {
  const db = readDB();
  const index = db.users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
  if (index !== -1) {
    db.users[index] = user;
  } else {
    db.users.push(user);
  }
  
  // Sync in leaderboard
  const lbIndex = db.leaderboard.findIndex(l => l.name === user.name);
  const userLevel = getUserLevel(user.points);
  if (lbIndex !== -1) {
    db.leaderboard[lbIndex].points = user.points;
    db.leaderboard[lbIndex].streak = user.streak;
    db.leaderboard[lbIndex].level = userLevel;
  } else {
    db.leaderboard.push({
      name: user.name,
      points: user.points,
      streak: user.streak,
      level: userLevel
    });
  }
  
  // Sort leaderboard
  db.leaderboard.sort((a, b) => b.points - a.points);
  
  writeDB(db);
}

// Helper: Calculate user level based on points
export function getUserLevel(points: number): string {
  if (points >= 1000) return "Eco-Warrior";
  if (points >= 500) return "Green Guardian";
  if (points >= 250) return "Habit Builder";
  return "Eco-Novice";
}

// Helper: Add points and update streak
export function updateUserActivity(email: string, pointsToAdd: number, dateStr: string): User | undefined {
  const user = getUserByEmail(email);
  if (!user) return undefined;
  
  user.points += pointsToAdd;
  
  // Handle streak
  const lastActive = user.lastActiveDate;
  if (lastActive) {
    const last = new Date(lastActive);
    const curr = new Date(dateStr);
    const diffTime = Math.abs(curr.getTime() - last.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      user.streak += 1;
    } else if (diffDays > 1) {
      user.streak = 1; // reset streak if gap is greater than 1 day
    }
  } else {
    user.streak = 1;
  }
  
  user.lastActiveDate = dateStr;
  
  // Check and award badges based on milestones
  const awardedBadges = [...user.badges];
  
  if (user.points >= 100 && !awardedBadges.includes("eco-starter")) {
    awardedBadges.push("eco-starter");
  }
  if (user.points >= 500 && !awardedBadges.includes("green-guardian")) {
    awardedBadges.push("green-guardian");
  }
  if (user.points >= 1000 && !awardedBadges.includes("eco-warrior")) {
    awardedBadges.push("eco-warrior");
  }
  if (user.streak >= 5 && !awardedBadges.includes("streak-star")) {
    awardedBadges.push("streak-star");
  }
  
  user.badges = awardedBadges;
  saveUser(user);
  return user;
}
