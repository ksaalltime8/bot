import fs from "node:fs";
import path from "node:path";

export type BotMode = "demo" | "live";
export type BotStatusValue = "online" | "offline" | "setup_required";

export type ActivityKind = "moderation" | "member" | "system" | "command";
export type ActivityTone = "blue" | "green" | "amber" | "red" | "purple";
export type ModerationAction = "warn" | "mute" | "kick" | "ban" | "delete";

export interface Server {
  id: string;
  name: string;
  initials: string;
  memberCount: number;
  onlineCount: number;
  status: "healthy" | "attention";
  accent: string;
}

export interface ServerSettings {
  serverId: string;
  prefix: string;
  welcomeEnabled: boolean;
  welcomeChannel: string;
  autoModEnabled: boolean;
  logChannel: string;
  verificationLevel: "low" | "medium" | "high";
}

export interface ModerationCase {
  id: string;
  serverId: string;
  user: string;
  userTag: string;
  action: ModerationAction;
  reason: string;
  moderator: string;
  status: "open" | "resolved";
  createdAt: string;
}

export interface BotCommand {
  name: string;
  description: string;
  category: "moderation" | "community" | "utility" | "fun";
  enabled: boolean;
  uses: number;
}

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  timestamp: string;
  tone: ActivityTone;
}

interface PersistedState {
  servers: Server[];
  settings: Record<string, ServerSettings>;
  cases: ModerationCase[];
  commands: BotCommand[];
  activity: ActivityItem[];
  actionsToday: number;
}

const dataFile = process.env.BOT_DATA_FILE ?? path.join(process.cwd(), "data", "state.json");

const seededState: PersistedState = {
  actionsToday: 27,
  servers: [
    {
      id: "guild-aurora",
      name: "Aurora Lounge",
      initials: "AL",
      memberCount: 4821,
      onlineCount: 914,
      status: "healthy",
      accent: "violet",
    },
    {
      id: "guild-makers",
      name: "Makers Assembly",
      initials: "MA",
      memberCount: 1268,
      onlineCount: 247,
      status: "healthy",
      accent: "cyan",
    },
    {
      id: "guild-nightshift",
      name: "Night Shift",
      initials: "NS",
      memberCount: 846,
      onlineCount: 143,
      status: "attention",
      accent: "orange",
    },
  ],
  settings: {
    "guild-aurora": {
      serverId: "guild-aurora",
      prefix: "!",
      welcomeEnabled: true,
      welcomeChannel: "#welcome",
      autoModEnabled: true,
      logChannel: "#mod-log",
      verificationLevel: "medium",
    },
    "guild-makers": {
      serverId: "guild-makers",
      prefix: "!",
      welcomeEnabled: true,
      welcomeChannel: "#start-here",
      autoModEnabled: true,
      logChannel: "#moderation",
      verificationLevel: "high",
    },
    "guild-nightshift": {
      serverId: "guild-nightshift",
      prefix: "?",
      welcomeEnabled: false,
      welcomeChannel: "#general",
      autoModEnabled: true,
      logChannel: "#staff",
      verificationLevel: "low",
    },
  },
  cases: [
    {
      id: "case-1042",
      serverId: "guild-aurora",
      user: "Mika Tan",
      userTag: "@mika.t",
      action: "mute",
      reason: "Repeated link spam in #general",
      moderator: "Nova",
      status: "open",
      createdAt: "12 min ago",
    },
    {
      id: "case-1041",
      serverId: "guild-makers",
      user: "Riley Chen",
      userTag: "@riley.c",
      action: "warn",
      reason: "Harassment reported by two members",
      moderator: "Avery",
      status: "open",
      createdAt: "48 min ago",
    },
    {
      id: "case-1040",
      serverId: "guild-nightshift",
      user: "Jordan Cole",
      userTag: "@jcole",
      action: "delete",
      reason: "AutoMod blocked a suspicious invite",
      moderator: "AutoMod",
      status: "resolved",
      createdAt: "2 hr ago",
    },
  ],
  commands: [
    { name: "ping", description: "Check the bot response time", category: "utility", enabled: true, uses: 928 },
    { name: "help", description: "Show available commands", category: "utility", enabled: true, uses: 604 },
    { name: "poll", description: "Start a quick community poll", category: "community", enabled: true, uses: 312 },
    { name: "warn", description: "Issue a documented warning", category: "moderation", enabled: true, uses: 86 },
    { name: "mute", description: "Temporarily restrict a member", category: "moderation", enabled: true, uses: 49 },
    { name: "server", description: "Show server health and member stats", category: "community", enabled: true, uses: 177 },
    { name: "roll", description: "Roll a number for the server", category: "fun", enabled: false, uses: 0 },
    { name: "avatar", description: "Show a member avatar", category: "fun", enabled: false, uses: 0 },
  ],
  activity: [
    {
      id: "activity-1",
      kind: "moderation",
      title: "AutoMod blocked an invite",
      detail: "Night Shift · #general",
      timestamp: "2 minutes ago",
      tone: "red",
    },
    {
      id: "activity-2",
      kind: "member",
      title: "New member joined",
      detail: "Aurora Lounge · welcome sent",
      timestamp: "18 minutes ago",
      tone: "green",
    },
    {
      id: "activity-3",
      kind: "command",
      title: "Poll closed with 74 votes",
      detail: "Makers Assembly · #community",
      timestamp: "43 minutes ago",
      tone: "purple",
    },
    {
      id: "activity-4",
      kind: "system",
      title: "Server settings synced",
      detail: "All connected servers",
      timestamp: "1 hour ago",
      tone: "blue",
    },
  ],
};

function cloneState(state: PersistedState): PersistedState {
  return JSON.parse(JSON.stringify(state)) as PersistedState;
}

function loadState(): PersistedState {
  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    return { ...seededState, ...JSON.parse(raw) } as PersistedState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return cloneState(seededState);
    }
    throw error;
  }
}

let state = loadState();

function persist() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
}

export function getState() {
  return state;
}

export function syncServers(servers: Server[]) {
  state.servers = servers;
  for (const server of servers) {
    if (!state.settings[server.id]) {
      state.settings[server.id] = {
        serverId: server.id,
        prefix: "!",
        welcomeEnabled: true,
        welcomeChannel: "#welcome",
        autoModEnabled: true,
        logChannel: "#mod-log",
        verificationLevel: "medium",
      };
    }
  }
  persist();
}

export function saveState() {
  persist();
}

export function addActivity(item: Omit<ActivityItem, "id">) {
  state.activity.unshift({ ...item, id: `activity-${Date.now()}` });
  state.activity = state.activity.slice(0, 20);
  persist();
}

export function recordAction() {
  state.actionsToday += 1;
  persist();
}

export function recordCommandUse(name: string) {
  const command = state.commands.find((item) => item.name === name);
  if (command) command.uses += 1;
  state.actionsToday += 1;
  persist();
}

export function getSettings(serverId: string) {
  return state.settings[serverId] ?? state.settings["guild-aurora"];
}

export function updateSettings(serverId: string, patch: Partial<ServerSettings>) {
  const current = getSettings(serverId);
  state.settings[serverId] = { ...current, ...patch, serverId };
  persist();
  return state.settings[serverId];
}

export function addCase(input: Omit<ModerationCase, "id" | "createdAt" | "status">) {
  const moderationCase: ModerationCase = {
    ...input,
    id: `case-${1043 + state.cases.length}`,
    status: "open",
    createdAt: "just now",
  };
  state.cases.unshift(moderationCase);
  persist();
  return moderationCase;
}

export function updateCommand(name: string, enabled: boolean) {
  const command = state.commands.find((item) => item.name === name);
  if (!command) return undefined;
  command.enabled = enabled;
  persist();
  return command;
}