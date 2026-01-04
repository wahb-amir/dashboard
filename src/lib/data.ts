export const users = {
  'user-1': {
    name: 'Alex Starr',
    avatar: 'avatar1',
  },
  'user-2': {
    name: 'Jordan Lee',
    avatar: 'avatar2',
  },
  'user-3': {
    name: 'Taylor Kim',
    avatar: 'avatar3',
  },
  'user-4': {
    name: 'Casey Morgan',
    avatar: 'avatar4',
  },
};

export const projects = [
  {
    id: 'proj-1',
    name: 'QuantumLeap CRM',
    client: 'Innovate Inc.',
    progress: 75,
    team: ['user-1', 'user-2'],
    status: 'In Progress',
  },
  {
    id: 'proj-2',
    name: 'Nebula-Flow',
    client: 'Synergy Corp.',
    progress: 45,
    team: ['user-3', 'user-4', 'user-1'],
    status: 'In Progress',
  },
  {
    id: 'proj-3',
    name: 'Aether-Analytics',
    client: 'Visionary Ltd.',
    progress: 90,
    team: ['user-2', 'user-4'],
    status: 'Near Completion',
  },
  {
    id: 'proj-4',
    name: 'Zenith-E-commerce',
    client: 'Apex Retail',
    progress: 20,
    team: ['user-1', 'user-3'],
    status: 'Started',
  },
  {
    id: 'proj-5',
    name: 'Helios-HRM',
    client: 'Starlight Co.',
    progress: 100,
    team: ['user-2', 'user-3', 'user-4'],
    status: 'Completed',
  },
];

export const notifications = [
  {
    id: 'notif-1',
    title: 'New message from Taylor Kim',
    description: 'Regarding the Aether-Analytics project...',
    time: '5m ago',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Task completed: UI Mockups',
    description: 'Alex Starr completed a task on QuantumLeap CRM.',
    time: '30m ago',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'New quote request',
    description: 'From "Future Gadgets Lab" for a new mobile app.',
    time: '1h ago',
    read: true,
  },
  {
    id: 'notif-4',
    title: 'GitHub: 3 new commits',
    description: 'Jordan Lee pushed 3 new commits to Nebula-Flow.',
    time: '2h ago',
    read: true,
  },
];

export const recentActivity = [
  {
    id: 'act-1',
    userId: 'user-2',
    action: 'pushed a commit to',
    project: 'Nebula-Flow',
    details: 'feat: add real-time validation to form',
    time: '10m ago',
  },
  {
    id: 'act-2',
    userId: 'user-1',
    action: 'created a pull request in',
    project: 'QuantumLeap CRM',
    details: 'fix: resolve issue with user authentication flow',
    time: '45m ago',
  },
  {
    id: 'act-3',
    userId: 'user-4',
    action: 'commented on an issue in',
    project: 'Aether-Analytics',
    details: '#125 - Dashboard loading speed degradation',
    time: '1h ago',
  },
   {
    id: 'act-4',
    userId: 'user-3',
    action: 'merged a pull request in',
    project: 'Zenith-E-commerce',
    details: 'refactor: optimize image loading component',
    time: '3h ago',
  },
];

export const quoteRequests = [
  {
    id: 'quote-1',
    projectName: 'E-commerce Platform',
    client: 'Global Mart',
    date: '2023-10-26',
    status: 'Pending',
    details: 'Full-featured e-commerce platform with multi-vendor support, payment gateway integration, and a custom recommendation engine. Target launch Q2 2024.'
  },
  {
    id: 'quote-2',
    projectName: 'Mobile Banking App',
    client: 'Secure Bank',
    date: '2023-10-24',
    status: 'Approved',
    details: 'A secure mobile banking application for iOS and Android with features like fund transfer, bill payments, and biometric login.'
  },
  {
    id: 'quote-3',
    projectName: 'Inventory Management System',
    client: 'Crafty Creations',
    date: '2023-10-22',
    status: 'In Review',
    details: 'A web-based system to track inventory, manage stock levels, and generate reports for a small chain of craft stores.'
  },
  {
    id: 'quote-4',
    projectName: 'AI-Powered Chatbot',
    client: 'Support Solutions',
    date: '2023-10-20',
    status: 'Rejected',
    details: 'An intelligent chatbot for customer support, capable of handling complex queries and integrating with existing ticketing systems.'
  },
];

export const messages = {
  'user-2': [
    { from: 'them', text: "Hey! Just wanted to check in on the 'Nebula-Flow' designs. Any progress?", time: '10:30 AM' },
    { from: 'me', text: 'Hi Jordan! Yes, I just pushed the latest wireframes to the shared drive. Let me know your thoughts!', time: '10:31 AM' },
    { from: 'them', text: "Awesome, I'll take a look now. Also, did you see the client's latest feedback on the color palette?", time: '10:32 AM' },
    { from: 'them', text: "They're suggesting a slightly lighter shade of blue for the primary CTAs.", time: '10:32 AM' },
    { from: 'me', text: "Got it. I'll make that adjustment and send over a revised version shortly.", time: '10:35 AM' },
  ],
  'user-3': [
    { from: 'them', text: 'Quick question about the Aether-Analytics API. Are the new endpoints live on the staging server?', time: 'Yesterday' },
    { from: 'me', text: 'Hey Taylor. Not yet, we ran into a small snag with the database migration. Planning to deploy them by EOD today.', time: 'Yesterday' },
    { from: 'them', text: 'No worries, thanks for the update! Ping me when it\'s ready for testing.', time: 'Yesterday' },
  ],
  'user-4': [
    { from: 'them', text: 'Can we schedule a quick sync-up call for the Zenith project tomorrow?', time: '3 days ago' },
    { from: 'me', text: 'Sure, Casey. Does 10 AM work for you?', time: '3 days ago' },
  ],
};

export const taskData = [
  { name: "Jan", tasksCompleted: 40, tasksCreated: 24 },
  { name: "Feb", tasksCompleted: 30, tasksCreated: 13 },
  { name: "Mar", tasksCompleted: 20, tasksCreated: 98 },
  { name: "Apr", tasksCompleted: 27, tasksCreated: 39 },
  { name: "May", tasksCompleted: 18, tasksCreated: 48 },
  { name: "Jun", tasksCompleted: 23, tasksCreated: 38 },
  { name: "Jul", tasksCompleted: 34, tasksCreated: 43 },
];

export const currentUser = {
  name: "Morgan Stone",
  email: "morgan.s@example.com",
  contactEmail: "morgan.s@personal.com",
  avatar: "avatar5",
};
