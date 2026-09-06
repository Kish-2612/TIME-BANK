export const CATEGORIES = [
  "All",
  "Technology",
  "Education",
  "Design",
  "Fitness",
  "Photography",
  "Cooking",
  "Repair",
  "Languages"
];

export const currentUser = {
  id: "u_alex",
  fullName: "Alex Rivera",
  username: "alex",
  email: "alex@timebank.app",
  location: "Bengaluru, IN",
  bio: "I trade hours in software mentoring, writing, and community onboarding. Time is the only currency I trust.",
  skills: ["JavaScript", "Product Design", "Mentoring"],
  verified: true,
  rating: 4.9,
  hoursGiven: 127,
  hoursReceived: 84,
  peopleHelped: 32,
  reputation: 92,
  balance: 8.5,
  earned: 15,
  spent: 6.5,
  community: 3,
  earnedThisWeek: 2,
  earnedThisMonth: 2.5
};

export const users = [
  currentUser,
  {
    id: "u_arjun",
    fullName: "Arjun Mehta",
    username: "arjun",
    location: "Pune, IN",
    bio: "Java mentor focused on OOP, DSA and first-job readiness.",
    skills: ["Java", "DSA"],
    verified: true,
    rating: 4.9,
    hoursGiven: 96,
    hoursReceived: 41,
    peopleHelped: 28,
    reputation: 94
  },
  {
    id: "u_priya",
    fullName: "Priya Nair",
    username: "priya",
    location: "Kochi, IN",
    bio: "Python and data science mentor. Patient, structured, practical.",
    skills: ["Python", "Data Science"],
    verified: true,
    rating: 4.9,
    hoursGiven: 110,
    hoursReceived: 52,
    peopleHelped: 34,
    reputation: 96
  },
  {
    id: "u_rahul",
    fullName: "Rahul Iyer",
    username: "rahul",
    location: "Chennai, IN",
    bio: "Frontend engineer who loves pairing on real product bugs.",
    skills: ["React", "CSS"],
    verified: false,
    rating: 4.7,
    hoursGiven: 44,
    hoursReceived: 61,
    peopleHelped: 12,
    reputation: 81
  },
  {
    id: "u_maya",
    fullName: "Maya Chen",
    username: "maya",
    location: "Singapore",
    bio: "Brand and product designer. I trade visual systems for deep work hours.",
    skills: ["Brand Design", "Figma"],
    verified: true,
    rating: 4.8,
    hoursGiven: 72,
    hoursReceived: 39,
    peopleHelped: 19,
    reputation: 88
  },
  {
    id: "u_leo",
    fullName: "Leo Santos",
    username: "leo",
    location: "Lisbon, PT",
    bio: "Strength coach and mobility specialist for desk-bound builders.",
    skills: ["Fitness", "Mobility"],
    verified: true,
    rating: 4.8,
    hoursGiven: 58,
    hoursReceived: 22,
    peopleHelped: 21,
    reputation: 86
  }
];

export const services = [
  {
    id: "s_java",
    userId: "u_arjun",
    title: "Java Programming",
    category: "Technology",
    description: "I can help you understand Java OOP, DSA and programming fundamentals.",
    duration: 1,
    cost: 1,
    availability: "Weeknights",
    location: "Online",
    mode: "Online",
    rating: 4.9
  },
  {
    id: "s_python",
    userId: "u_priya",
    title: "Python Mentoring",
    category: "Education",
    description: "Pairing sessions on Python, pandas, and interview-style data problems.",
    duration: 1,
    cost: 1,
    availability: "Weekends",
    location: "Online",
    mode: "Online",
    rating: 4.9
  },
  {
    id: "s_design",
    userId: "u_maya",
    title: "Product Design Critique",
    category: "Design",
    description: "A focused hour on hierarchy, spacing, and making interfaces feel expensive.",
    duration: 1,
    cost: 1,
    availability: "Tue–Thu",
    location: "Online",
    mode: "Online",
    rating: 4.8
  },
  {
    id: "s_fit",
    userId: "u_leo",
    title: "Desk-Body Reset",
    category: "Fitness",
    description: "Mobility and strength for people who sit too long and want energy back.",
    duration: 0.5,
    cost: 0.5,
    availability: "Mornings",
    location: "Lisbon / Online",
    mode: "Online",
    rating: 4.8
  },
  {
    id: "s_photo",
    userId: "u_rahul",
    title: "Portrait Lighting Basics",
    category: "Photography",
    description: "Learn natural light portraits with whatever camera you already own.",
    duration: 1.5,
    cost: 1.5,
    availability: "Saturdays",
    location: "Chennai",
    mode: "In Person",
    rating: 4.6
  },
  {
    id: "s_cook",
    userId: "u_maya",
    title: "Weeknight Cooking Lab",
    category: "Cooking",
    description: "Three reliable meals, one hour, no specialty equipment required.",
    duration: 1,
    cost: 1,
    availability: "Fridays",
    location: "Online",
    mode: "Online",
    rating: 4.7
  },
  {
    id: "s_repair",
    userId: "u_leo",
    title: "Home Repair Clinic",
    category: "Repair",
    description: "Hinges, leaks, and the small fixes that usually wait too long.",
    duration: 1,
    cost: 1,
    availability: "Weekends",
    location: "Lisbon",
    mode: "In Person",
    rating: 4.5
  },
  {
    id: "s_lang",
    userId: "u_priya",
    title: "Conversational Malayalam",
    category: "Languages",
    description: "Gentle conversation practice for travel, family, and everyday warmth.",
    duration: 1,
    cost: 1,
    availability: "Evenings",
    location: "Online",
    mode: "Online",
    rating: 4.9
  }
];

export const transactions = [
  { id: "t1", type: "earned", amount: 1, service: "Java Tutoring", person: "Rahul Iyer", date: "2026-09-06", status: "Completed" },
  { id: "t2", type: "spent", amount: 0.5, service: "Graphic Design", person: "Maya Chen", date: "2026-09-05", status: "Completed" },
  { id: "t3", type: "earned", amount: 2, service: "Web Development", person: "Priya Nair", date: "2026-08-28", status: "Completed" },
  { id: "t4", type: "donated", amount: 1, service: "Community Pool", person: "TimeBank Community", date: "2026-08-20", status: "Completed" },
  { id: "t5", type: "spent", amount: 1, service: "Python Mentoring", person: "Priya Nair", date: "2026-08-12", status: "Completed" },
  { id: "t6", type: "earned", amount: 1, service: "Product Critique", person: "Arjun Mehta", date: "2026-08-02", status: "Pending" }
];

export const requests = [
  {
    id: "r1",
    status: "new",
    fromId: "u_rahul",
    serviceId: "s_java",
    hours: 1,
    message: "Can you help me understand inheritance?"
  },
  {
    id: "r2",
    status: "new",
    fromId: "u_maya",
    serviceId: "s_python",
    hours: 1,
    message: "I need a second pair of eyes on a pandas join."
  }
];

export const notifications = [
  { id: "n1", unread: true, type: "request", title: "New service request", body: "Rahul wants 1 hour of Java help." },
  { id: "n2", unread: true, type: "earn", title: "You earned 1 Time Credit", body: "Web Development session marked complete." },
  { id: "n3", unread: false, type: "rating", title: "Someone rated your service", body: "Arjun left a 5-star review." },
  { id: "n4", unread: true, type: "match", title: "Your smart match is ready", body: "Priya is a 94% skill match." },
  { id: "n5", unread: false, type: "pool", title: "Someone joined your community pool", body: "A member donated 2 hours." }
];

export const matches = [
  {
    id: "m1",
    userId: "u_priya",
    percent: 94,
    need: "Python Mentoring",
    offer: "Python + Data Science"
  },
  {
    id: "m2",
    userId: "u_arjun",
    percent: 88,
    need: "Backend fundamentals",
    offer: "Java + DSA"
  },
  {
    id: "m3",
    userId: "u_maya",
    percent: 81,
    need: "Visual polish",
    offer: "Brand + product design"
  }
];

export const reviews = [
  { id: "rv1", userId: "u_rahul", rating: 5, text: "Clear, generous, and exact with time. Felt like a real exchange." },
  { id: "rv2", userId: "u_priya", rating: 5, text: "Alex made debugging feel collaborative instead of extractive." },
  { id: "rv3", userId: "u_maya", rating: 4, text: "Strong taste. Would trade hours again for a longer critique." }
];

export const weeklyActivity = [1.5, 2.0, 0.5, 3.0, 1.0, 2.5, 2.0];
export const monthlyExchange = [6, 8, 5, 9, 7, 11, 8, 10, 12, 9, 14, 11];
export const communityPool = { hours: 1284, donors: 428, helped: 312 };

export const stats = {
  members: 10000,
  hours: 28000,
  services: 6500,
  rating: 4.9
};
