import { Router, type IRouter, type Response } from "express";
import {
  GetBotStatusResponse,
  GetDashboardSummaryResponse,
  GetActivityQueryParams,
  GetActivityResponse,
  GetServerSettingsParams,
  GetServerSettingsResponse,
  ListCommandsResponse,
  ListModerationCasesQueryParams,
  ListModerationCasesResponse,
  ListServersResponse,
  UpdateCommandBody,
  UpdateCommandParams,
  UpdateCommandResponse,
  UpdateServerSettingsBody,
  UpdateServerSettingsParams,
  UpdateServerSettingsResponse,
  CreateModerationActionBody,
  CreateModerationActionResponse,
} from "@workspace/api-zod";
import {
  addActivity,
  addCase,
  getSettings,
  getState,
  updateCommand,
  updateSettings,
} from "../lib/bot-store";
import { applyLiveModerationAction, getBotStatus } from "../lib/discord-bot";

const router: IRouter = Router();
const streamClients = new Set<Response>();

function buildDashboardSummary() {
  const state = getState();
  const botStatus = getBotStatus();
  const openCases = state.cases.filter((item) => item.status === "open").length;
  const enabledCommands = state.commands.filter((item) => item.enabled).length;
  return GetDashboardSummaryResponse.parse({
    botStatus:
      botStatus.mode === "demo"
        ? "demo"
        : botStatus.status === "online"
          ? "online"
          : "offline",
    servers: state.servers.length,
    members: state.servers.reduce((sum, server) => sum + server.memberCount, 0),
    actionsToday: state.actionsToday,
    openCases,
    protectedChannels: 12,
    commandCoverage: Math.round((enabledCommands / state.commands.length) * 100),
  });
}

function sendStreamSnapshot(res: Response) {
  const payload = JSON.stringify({
    summary: buildDashboardSummary(),
    servers: getState().servers,
    activity: getState().activity.slice(0, 6),
    updatedAt: new Date().toISOString(),
  });
  res.write(`event: stats\ndata: ${payload}\n\n`);
}

const streamTimer = setInterval(() => {
  for (const client of streamClients) {
    try {
      sendStreamSnapshot(client);
    } catch {
      streamClients.delete(client);
    }
  }
}, 5000);
streamTimer.unref();

router.get("/dashboard/summary", (_req, res) => {
  res.json(buildDashboardSummary());
});

router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  streamClients.add(res);
  sendStreamSnapshot(res);
  req.on("close", () => {
    streamClients.delete(res);
  });
});

router.get("/activity", (req, res) => {
  const params = GetActivityQueryParams.parse(req.query);
  res.json(GetActivityResponse.parse(getState().activity.slice(0, params.limit ?? 8)));
});

router.get("/servers", (_req, res) => {
  res.json(ListServersResponse.parse(getState().servers));
});

router.get("/servers/:serverId/settings", (req, res) => {
  const { serverId } = GetServerSettingsParams.parse(req.params);
  res.json(GetServerSettingsResponse.parse(getSettings(serverId)));
});

router.patch("/servers/:serverId/settings", (req, res) => {
  const { serverId } = UpdateServerSettingsParams.parse(req.params);
  const body = UpdateServerSettingsBody.parse(req.body);
  const settings = updateSettings(serverId, body);
  addActivity({
    kind: "system",
    title: "Server settings updated",
    detail: `${serverId} · changes saved`,
    timestamp: "just now",
    tone: "blue",
  });
  res.json(UpdateServerSettingsResponse.parse(settings));
});

router.get("/moderation/cases", (req, res) => {
  const { status } = ListModerationCasesQueryParams.parse(req.query);
  const cases = status === "all" ? getState().cases : getState().cases.filter((item) => item.status === status);
  res.json(ListModerationCasesResponse.parse(cases));
});

router.post("/moderation/actions", async (req, res) => {
  const body = CreateModerationActionBody.parse(req.body);
  try {
    await applyLiveModerationAction(body.serverId, body.user, body.action, body.reason);
    const moderationCase = addCase(body);
    addActivity({
      kind: "moderation",
      title: `Action applied: ${body.action}`,
      detail: `${body.userTag} · ${body.reason}`,
      timestamp: "just now",
      tone: body.action === "ban" ? "red" : "amber",
    });
    res.status(201).json(CreateModerationActionResponse.parse(moderationCase));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not apply moderation action" });
  }
});

router.get("/commands", (_req, res) => {
  res.json(ListCommandsResponse.parse(getState().commands));
});

router.patch("/commands/:commandName", (req, res) => {
  const { commandName } = UpdateCommandParams.parse(req.params);
  const { enabled } = UpdateCommandBody.parse(req.body);
  const command = updateCommand(commandName, enabled);
  if (!command) {
    res.status(404).json({ error: "Command not found" });
    return;
  }
  addActivity({
    kind: "command",
    title: `${enabled ? "Enabled" : "Disabled"} /${commandName}`,
    detail: "Command catalog updated",
    timestamp: "just now",
    tone: enabled ? "green" : "amber",
  });
  res.json(UpdateCommandResponse.parse(command));
});

router.get("/bot/status", (_req, res) => {
  res.json(GetBotStatusResponse.parse(getBotStatus()));
});

export default router;