import { GoogleGenerativeAI } from "@google/generative-ai";
import { UserProfile, FootprintEntry } from "./db";

// Initialize Gemini client if API key is provided
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Structure of AI Coach Response
export interface CoachResponse {
  message: string;
  suggestedActions: Array<{
    title: string;
    description: string;
    co2Reduction: number; // kg
    difficulty: "Easy" | "Medium" | "Hard";
    costSavings: number;  // $
    timeRequired: string;
  }>;
}

// 1. Core AI Coach Interaction
export async function getCoachResponse(
  email: string,
  userProfile: UserProfile,
  latestFootprint: FootprintEntry | null,
  userMessage: string,
  chatHistory: Array<{ role: "user" | "model"; text: string }>
): Promise<CoachResponse> {
  
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const systemPrompt = `
You are EcoCoach, a friendly, encouraging, and highly knowledgeable AI Sustainability Coach for the platform EcoTrack.
Your goal is to help individuals understand, track, and reduce their carbon footprint in simple, practical terms.

Here is the user's current carbon footprint profile:
- Location: ${userProfile.location}
- Transportation habits: ${userProfile.transportation}
- Diet preferences: ${userProfile.diet}
- Electricity usage: ${userProfile.electricity} kWh/month
- Shopping habits: ${userProfile.shopping} purchases
- Waste management: ${userProfile.waste} recycling/composting

Latest calculated emissions (daily kg CO2):
- Transportation: ${latestFootprint?.transport ?? "Not calculated yet"} kg
- Energy: ${latestFootprint?.energy ?? "Not calculated yet"} kg
- Food: ${latestFootprint?.food ?? "Not calculated yet"} kg
- Shopping: ${latestFootprint?.shopping ?? "Not calculated yet"} kg
- Waste: ${latestFootprint?.waste ?? "Not calculated yet"} kg
- Total daily footprint: ${latestFootprint?.total ?? "Not calculated yet"} kg

Please respond to the user's query in markdown, keeping it engaging, concise (under 200 words), and highly actionable.
Provide practical advice based on their highest emission categories.

You must return your response in JSON format matching this TypeScript interface:
{
  "message": "Your conversational response here in markdown",
  "suggestedActions": [
    {
      "title": "Action title",
      "description": "Brief description of how to do it",
      "co2Reduction": 12.5, // estimated kg CO2 reduced per week/month
      "difficulty": "Easy" | "Medium" | "Hard",
      "costSavings": 15.00, // in dollars
      "timeRequired": "e.g. 10 mins, daily"
    }
  ]
}
Return ONLY valid JSON.
`;

      const chat = model.startChat({
        history: chatHistory.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
        })),
        systemInstruction: systemPrompt,
      });

      const response = await chat.sendMessage(userMessage);
      const text = response.response.text();
      
      // Clean up markdown block wraps if present
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const cleanJson = text.substring(jsonStart, jsonEnd);
        return JSON.parse(cleanJson);
      }
      
      throw new Error("Invalid response format");
    } catch (error) {
      console.error("Gemini API error, falling back to local coach rules:", error);
    }
  }

  // Local rule-based coaching fallback (when GEMINI_API_KEY is not defined)
  return getLocalCoachResponse(userProfile, latestFootprint, userMessage);
}

// 2. AI Future Carbon Footprint Trend Predictor
export function predictCarbonTrends(
  history: FootprintEntry[],
  habitLogsCount: number
): {
  months: string[];
  businessAsUsual: number[];
  sustainablePath: number[];
} {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  
  // Calculate average daily emissions from history or default to 32 kg CO2 (typical North American average)
  let currentAverage = 32.0;
  if (history.length > 0) {
    const sum = history.reduce((acc, entry) => acc + entry.total, 0);
    currentAverage = sum / history.length;
  }
  
  const businessAsUsual: number[] = [];
  const sustainablePath: number[] = [];
  
  // High energy / seasonal variance mock
  for (let i = 0; i < 6; i++) {
    const seasonalModifier = 1 + Math.sin(i * 0.8) * 0.05; // +/- 5% seasonal changes
    const bauEmissions = currentAverage * 30 * seasonalModifier; // Monthly total
    businessAsUsual.push(parseFloat(bauEmissions.toFixed(1)));
    
    // Sustainable path assumes reduction over time based on habitLogsCount
    const reductionMultiplier = Math.max(0.6, 1 - (i * 0.06) - (habitLogsCount * 0.015));
    const susEmissions = currentAverage * 30 * seasonalModifier * reductionMultiplier;
    sustainablePath.push(parseFloat(susEmissions.toFixed(1)));
  }

  return { months, businessAsUsual, sustainablePath };
}

// Local simulation helper
function getLocalCoachResponse(
  userProfile: UserProfile,
  latestFootprint: FootprintEntry | null,
  userMessage: string
): CoachResponse {
  const query = userMessage.toLowerCase();
  
  let responseText = "";
  const actions: CoachResponse["suggestedActions"] = [];
  
  // Determine highest emission category
  let maxCat = "none";
  let maxVal = 0;
  if (latestFootprint) {
    const categories = [
      { name: "transport", val: latestFootprint.transport },
      { name: "energy", val: latestFootprint.energy },
      { name: "food", val: latestFootprint.food },
      { name: "shopping", val: latestFootprint.shopping },
      { name: "waste", val: latestFootprint.waste }
    ];
    categories.sort((a, b) => b.val - a.val);
    maxCat = categories[0].name;
    maxVal = categories[0].val;
  } else {
    // Determine based on profile if no logs
    if (userProfile.transportation.includes("car")) maxCat = "transport";
    else if (userProfile.electricity > 300) maxCat = "energy";
    else if (userProfile.diet === "meat-heavy") maxCat = "food";
    else maxCat = "shopping";
  }

  // Answer specific queries or generate general advice
  if (query.includes("diet") || query.includes("food") || query.includes("meat")) {
    responseText = "Adjusting your diet is one of the most effective ways to lower your emissions! Animal agriculture accounts for a significant portion of global greenhouse gases. Switching just one meal a day to plant-based options makes a measurable difference.";
    actions.push({
      title: "Introduce Meatless Mondays",
      description: "Replace all meat with plant-based proteins every Monday.",
      co2Reduction: 15,
      difficulty: "Easy",
      costSavings: 12.00,
      timeRequired: "1 day/week"
    });
    actions.push({
      title: "Buy Local Produce",
      description: "Purchase fruits and vegetables from local farmers' markets to reduce food transport miles.",
      co2Reduction: 8,
      difficulty: "Easy",
      costSavings: 5.00,
      timeRequired: "1 hour"
    });
  } else if (query.includes("transport") || query.includes("car") || query.includes("fly") || query.includes("travel")) {
    responseText = "Transportation represents a major share of personal emissions, especially solo car trips and flights. Commuting by bicycle, taking public transport, or carpooling can drastically shrink your daily carbon footprint.";
    actions.push({
      title: "Public Transit Commuting",
      description: "Replace 2 solo car commutes per week with bus, train, or light rail.",
      co2Reduction: 22,
      difficulty: "Medium",
      costSavings: 18.00,
      timeRequired: "2 days/week"
    });
    actions.push({
      title: "Eco-driving Techniques",
      description: "Drive smoothly, avoid excessive idling, and keep tires inflated to improve fuel efficiency by up to 10%.",
      co2Reduction: 12,
      difficulty: "Easy",
      costSavings: 25.00,
      timeRequired: "Ongoing"
    });
  } else if (query.includes("energy") || query.includes("electricity") || query.includes("power") || query.includes("heat")) {
    responseText = "Home energy usage is another primary carbon driver. Heating, cooling, and lighting account for most of it. Simple modifications like LED bulbs and smart thermostats deliver quick carbon and monetary savings.";
    actions.push({
      title: "Install LED Lighting",
      description: "Replace remaining incandescent bulbs in your home with energy-efficient LEDs.",
      co2Reduction: 18,
      difficulty: "Easy",
      costSavings: 15.00,
      timeRequired: "30 mins"
    });
    actions.push({
      title: "Unplug Idle Electronics",
      description: "Use smart power strips to shut down power to televisions and gaming systems when not in use.",
      co2Reduction: 8,
      difficulty: "Easy",
      costSavings: 6.00,
      timeRequired: "10 mins"
    });
  } else if (query.includes("waste") || query.includes("recycle") || query.includes("compost")) {
    responseText = "Proper waste management prevents methane generation in landfills. Composting organic waste and recycling plastics, paper, and glass significantly offsets emissions.";
    actions.push({
      title: "Set up Home Composting",
      description: "Separate food waste and organic scraps from regular garbage to compost them.",
      co2Reduction: 10,
      difficulty: "Medium",
      costSavings: 5.00,
      timeRequired: "30 mins"
    });
    actions.push({
      title: "Eliminate Single-Use Plastics",
      description: "Carry reusable bottles and shopping bags to eliminate plastic waste.",
      co2Reduction: 5,
      difficulty: "Easy",
      costSavings: 8.00,
      timeRequired: "Daily"
    });
  } else {
    // Default tailored response based on highest category
    responseText = `Hello! I'm EcoCoach. Looking at your footprint, your highest emissions seem to come from **${maxCat.toUpperCase()}** (estimated at ${maxVal.toFixed(1)} kg daily). Focus on this area first! Let's work together to reduce it. What specific questions do you have today?`;
    
    if (maxCat === "transport") {
      actions.push({
        title: "Carpool to Work/School",
        description: "Share rides with colleagues to cut travel emissions in half.",
        co2Reduction: 25,
        difficulty: "Medium",
        costSavings: 30.00,
        timeRequired: "Weekly"
      });
    } else if (maxCat === "energy") {
      actions.push({
        title: "Lower Thermostat by 1°C",
        description: "Lower heating slightly in winter or raise AC in summer to save 10% on energy bills.",
        co2Reduction: 30,
        difficulty: "Easy",
        costSavings: 20.00,
        timeRequired: "Instant"
      });
    } else if (maxCat === "food") {
      actions.push({
        title: "Switch to Plant Milk",
        description: "Substitute dairy milk with oat, almond, or soy milk.",
        co2Reduction: 6,
        difficulty: "Easy",
        costSavings: 2.00,
        timeRequired: "Daily"
      });
    } else {
      actions.push({
        title: "Buy Refurbished Electronics",
        description: "When buying gadgets, choose high-quality certified refurbished products.",
        co2Reduction: 120,
        difficulty: "Easy",
        costSavings: 150.00,
        timeRequired: "One-off"
      });
    }
  }

  return {
    message: responseText,
    suggestedActions: actions
  };
}
