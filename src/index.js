require("dotenv").config();

const http = require("http");

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ActivityType,
    EmbedBuilder,
    AutoModerationRuleTriggerType,
    AutoModerationRuleEventType,
    AutoModerationActionType,
    AutoModerationRuleKeywordPresetType
} = require("discord.js");

const axios = require("axios");

const {
    connectDatabase,
    getGuildConfig
} = require("./database/mongodb");

const {
    startKickChecker
} = require("./services/kickChecker");

// ==========================================
// ENV
// ==========================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const PORT = process.env.PORT || 5000;

// ==========================================
// ENV CHECK
// ==========================================

console.log("🔎 Checking environment...");

console.log(
    `🔐 Token: ${TOKEN ? "FOUND" : "MISSING"}`
);

console.log(
    `🆔 Client ID: ${CLIENT_ID ? "FOUND" : "MISSING"}`
);

console.log(
    `🏠 Guild ID: ${GUILD_ID ? "FOUND" : "MISSING"}`
);

console.log(
    `🍃 MongoDB: ${
        process.env.MONGODB_URI
            ? "FOUND"
            : "MISSING"
    }`
);

if (!TOKEN) {
    throw new Error("DISCORD_TOKEN is missing.");
}

if (!CLIENT_ID) {
    throw new Error("CLIENT_ID is missing.");
}

if (!GUILD_ID) {
    throw new Error("GUILD_ID is missing.");
}

if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing.");
}

// ==========================================
// WEB SERVER
// ==========================================

const server = http.createServer((req, res) => {

    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end(
        "K7Devs Discord bot is online!"
    );
});

server.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `🌐 Web server listening on ${PORT}`
        );
    }
);

// ==========================================
// DISCORD CLIENT
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// ==========================================
// /LIVE
// ==========================================

const liveCommand =
    new SlashCommandBuilder()
        .setName("live")
        .setDescription(
            "Manage KICK live alerts"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription(
                    "Set up KICK live alerts"
                )

                .addStringOption(option =>
                    option
                        .setName("link")
                        .setDescription(
                            "KICK channel link"
                        )
                        .setRequired(true)
                )

                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(
                            "Discord alert channel"
                        )
                        .addChannelTypes(
                            ChannelType.GuildText,
                            ChannelType.GuildAnnouncement
                        )
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("disable")
                .setDescription(
                    "Disable KICK live alerts"
                )
        );

// ==========================================
// /LIVECHECK
// ==========================================

const liveCheckCommand =
    new SlashCommandBuilder()
        .setName("livecheck")
        .setDescription(
            "Check if iik27 is live on KICK"
        );

// ==========================================
// /AUTOMOD
// ==========================================

const autoModCommand =
    new SlashCommandBuilder()
        .setName("automod")
        .setDescription(
            "Manage K7Devs AutoMod"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription(
                    "Set up AutoMod protection"
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("disable")
                .setDescription(
                    "Disable K7Devs AutoMod rules"
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("status")
                .setDescription(
                    "Show AutoMod status"
                )
        );

// ==========================================
// BUSINESS
// ==========================================

let businessCommand = null;

try {

    businessCommand =
        require(
            "./commands/utility/business"
        );

    console.log(
        "✅ /business loaded"
    );

} catch (error) {

    console.log(
        "⚠️ /business could not be loaded."
    );

    console.error(error);
}

// ==========================================
// COMMAND ARRAY
// ==========================================

const commands = [
    liveCommand.toJSON(),
    liveCheckCommand.toJSON(),
    autoModCommand.toJSON()
];

if (
    businessCommand &&
    businessCommand.data
) {

    commands.push(
        businessCommand.data.toJSON()
    );
}

console.log(
    `📦 ${commands.length} commands ready`
);

for (const command of commands) {

    console.log(
        `📋 /${command.name}`
    );
}

// ==========================================
// REGISTER COMMANDS
// ==========================================

async function registerCommands() {

    console.log(
        "📋 Registering Discord commands..."
    );

    const rest = new REST({
        version: "10",
        timeout: 10000
    }).setToken(TOKEN);

    try {

        const result =
            await rest.put(
                Routes.applicationGuildCommands(
                    CLIENT_ID,
                    GUILD_ID
                ),
                {
                    body: commands
                }
            );

        console.log(
            "✅ Discord commands registered!"
        );

        console.log(
            `📦 ${result.length} command(s)`
        );

        for (
            const command of result
        ) {

            console.log(
                `✅ /${command.name}`
            );
        }

    } catch (error) {

        console.error(
            "❌ Command registration failed:"
        );

        console.error(error);
    }
}

// ==========================================
// AUTOMOD
// ==========================================

const AUTOMOD_PREFIX = "K7Devs |";

// ==========================================
// GET AUTOMOD RULES
// ==========================================

async function getAutoModRules(guild) {

    try {

        return await guild.autoModerationRules.fetch();

    } catch (error) {

        console.error(
            "❌ Could not fetch AutoMod rules:"
        );

        console.error(
            error.message
        );

        if (error.code) {
            console.error(
                `Discord error code: ${error.code}`
            );
        }

        return null;
    }
}

// ==========================================
// SETUP AUTOMOD
// ==========================================

async function setupAutoMod(guild) {

    if (!guild) {

        return {
            success: false,
            message: "Guild not found.",
            created: 0,
            rules: [],
            ruleCount: 0
        };
    }

    // Only configured server
    if (guild.id !== GUILD_ID) {

        return {
            success: false,
            message:
                "AutoMod is only configured for the server in GUILD_ID.",
            created: 0,
            rules: [],
            ruleCount: 0
        };
    }

    console.log("");
    console.log(
        "================================"
    );
    console.log(
        "       K7DEVS AUTOMOD SETUP"
    );
    console.log(
        "================================"
    );

    console.log(
        `🏠 Server: ${guild.name}`
    );

    console.log(
        `🆔 Guild ID: ${guild.id}`
    );

    // ======================================
    // BOT MEMBER
    // ======================================

    let me;

    try {

        me =
            await guild.members.fetchMe();

    } catch (error) {

        console.error(
            "❌ Could not fetch bot member:",
            error.message
        );

        return {
            success: false,
            message:
                "Could not find the bot member.",
            created: 0,
            rules: [],
            ruleCount: 0
        };
    }

    // ======================================
    // PERMISSION
    // ======================================

    if (
        !me.permissions.has(
            PermissionFlagsBits.ManageGuild
        )
    ) {

        return {
            success: false,
            message:
                "I need the **Manage Server** permission.",
            created: 0,
            rules: [],
            ruleCount: 0
        };
    }

    // ======================================
    // INITIAL RULE FETCH
    // ======================================

    let rules =
        await getAutoModRules(guild);

    if (!rules) {

        return {
            success: false,
            message:
                "Discord did not allow me to access AutoMod rules.",
            created: 0,
            rules: [],
            ruleCount: 0
        };
    }

    console.log(
        `📊 Existing AutoMod rules: ${rules.size}`
    );

    let created = 0;

    // ======================================
    // CREATE HELPER
    // ======================================

    async function createRuleIfMissing(
        name,
        data
    ) {

        // Refresh rules
        rules =
            await getAutoModRules(guild);

        if (!rules) {
            return null;
        }

        const existing =
            rules.find(
                rule =>
                    rule.name === name
            );

        if (existing) {

            console.log(
                `↪️ Already exists: ${name}`
            );

            return existing;
        }

        try {

            const newRule =
                await guild.autoModerationRules.create(
                    {
                        ...data,
                        name: name
                    }
                );

            created++;

            console.log(
                `✅ Created: ${name}`
            );

            return newRule;

        } catch (error) {

            console.error("");
            console.error(
                `❌ Failed to create: ${name}`
            );

            console.error(
                `Message: ${error.message}`
            );

            if (error.code) {

                console.error(
                    `Discord error code: ${error.code}`
                );
            }

            return null;
        }
    }

    // ======================================
    // 1. SPAM
    // ======================================

    await createRuleIfMissing(
        `${AUTOMOD_PREFIX} Spam Protection`,
        {
            eventType:
                AutoModerationRuleEventType.MessageSend,

            triggerType:
                AutoModerationRuleTriggerType.Spam,

            actions: [
                {
                    type:
                        AutoModerationActionType.BlockMessage
                }
            ],

            enabled: true,

            reason:
                "K7Devs AutoMod setup"
        }
    );

    // ======================================
    // 2. MENTION SPAM
    // ======================================

    await createRuleIfMissing(
        `${AUTOMOD_PREFIX} Mention Protection`,
        {
            eventType:
                AutoModerationRuleEventType.MessageSend,

            triggerType:
                AutoModerationRuleTriggerType.MentionSpam,

            triggerMetadata: {
                mentionTotalLimit: 5
            },

            actions: [
                {
                    type:
                        AutoModerationActionType.BlockMessage
                }
            ],

            enabled: true,

            reason:
                "K7Devs AutoMod setup"
        }
    );

    // ======================================
    // 3. PROFANITY
    // ======================================

    await createRuleIfMissing(
        `${AUTOMOD_PREFIX} Profanity Filter`,
        {
            eventType:
                AutoModerationRuleEventType.MessageSend,

            triggerType:
                AutoModerationRuleTriggerType.KeywordPreset,

            triggerMetadata: {
                presets: [
                    AutoModerationRuleKeywordPresetType.Profanity
                ]
            },

            actions: [
                {
                    type:
                        AutoModerationActionType.BlockMessage
                }
            ],

            enabled: true,

            reason:
                "K7Devs AutoMod setup"
        }
    );

    // ======================================
    // 4. SCAM PROTECTION
    // ======================================

    await createRuleIfMissing(
        `${AUTOMOD_PREFIX} Scam Protection`,
        {
            eventType:
                AutoModerationRuleEventType.MessageSend,

            triggerType:
                AutoModerationRuleTriggerType.Keyword,

            triggerMetadata: {
                keywordFilter: [
                    "free nitro",
                    "discord nitro free",
                    "claim your nitro",
                    "steam gift",
                    "free steam",
                    "verify your account",
                    "verify account",
                    "login to claim",
                    "gift card giveaway",
                    "free gift card"
                ]
            },

            actions: [
                {
                    type:
                        AutoModerationActionType.BlockMessage
                }
            ],

            enabled: true,

            reason:
                "K7Devs AutoMod setup"
        }
    );

    // ======================================
    // FINAL FETCH
    // ======================================

    rules =
        await getAutoModRules(guild);

    if (!rules) {

        return {
            success: false,
            message:
                "Rules were processed, but Discord did not return the final rule list.",
            created,
            rules: [],
            ruleCount: 0
        };
    }

    // ======================================
    // ONLY OUR RULES
    // ======================================

    const ownedRules =
        [...rules.values()].filter(
            rule =>
                rule.name.startsWith(
                    AUTOMOD_PREFIX
                )
        );

    console.log("");
    console.log(
        `🛡️ K7Devs rules: ${ownedRules.length}`
    );

    console.log(
        `➕ Created this setup: ${created}`
    );

    for (
        const rule of ownedRules
    ) {

        console.log(
            `${rule.enabled ? "🟢" : "🔴"} ${rule.name}`
        );
    }

    console.log(
        "================================"
    );

    return {
        success: true,
        created: created,
        rules: ownedRules,
        ruleCount: ownedRules.length
    };
}

// ==========================================
// DISABLE AUTOMOD
// ==========================================

async function disableAutoMod(guild) {

    if (!guild) {

        return {
            success: false,
            message: "Guild not found.",
            disabled: 0
        };
    }

    if (guild.id !== GUILD_ID) {

        return {
            success: false,
            message:
                "AutoMod is only configured for the server in GUILD_ID.",
            disabled: 0
        };
    }

    const rules =
        await getAutoModRules(guild);

    if (!rules) {

        return {
            success: false,
            message:
                "Could not access AutoMod.",
            disabled: 0
        };
    }

    let disabled = 0;

    for (
        const rule of rules.values()
    ) {

        if (
            !rule.name.startsWith(
                AUTOMOD_PREFIX
            )
        ) {
            continue;
        }

        try {

            await rule.edit({
                enabled: false,
                reason:
                    "K7Devs AutoMod disabled"
            });

            disabled++;

            console.log(
                `🔕 Disabled: ${rule.name}`
            );

        } catch (error) {

            console.error(
                `❌ Could not disable ${rule.name}:`,
                error.message
            );
        }
    }

    return {
        success: true,
        disabled
    };
}

// ==========================================
// AUTOMOD STATUS
// ==========================================

async function getAutoModStatus(guild) {

    if (!guild) {
        return [];
    }

    if (guild.id !== GUILD_ID) {
        return [];
    }

    const rules =
        await getAutoModRules(guild);

    if (!rules) {
        return [];
    }

    return [...rules.values()].filter(
        rule =>
            rule.name.startsWith(
                AUTOMOD_PREFIX
            )
    );
}

// ==========================================
// KICK API
// ==========================================

async function getKickChannel(username) {

    try {

        const response =
            await axios.get(
                `https://kick.com/api/v2/channels/${encodeURIComponent(username)}`,
                {
                    headers: {
                        Accept:
                            "application/json",

                        "User-Agent":
                            "Mozilla/5.0 DiscordBot"
                    },

                    timeout: 10000
                }
            );

        return response.data;

    } catch (error) {

        console.error(
            "❌ KICK API error:",
            error.response?.status ||
            error.message
        );

        return null;
    }
}

// ==========================================
// /LIVECHECK
// ==========================================

async function handleLiveCheck(interaction) {

    await interaction.deferReply();

    const username = "iik27";

    try {

        console.log(
            `📺 Checking ${username}...`
        );

        const data =
            await getKickChannel(
                username
            );

        if (!data) {

            return interaction.editReply(
                "❌ KICK could not be reached right now."
            );
        }

        const isLive =
            data.livestream != null;

        if (!isLive) {

            console.log(
                `⚫ ${username} is offline.`
            );

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x2b2d31)
                        .setTitle(
                            "⚫ KICK Live Check"
                        )
                        .setDescription(
                            `**${username} is not live right now.**`
                        )
                        .setURL(
                            `https://kick.com/${username}`
                        )
                        .setTimestamp()
                ]
            });
        }

        const stream =
            data.livestream;

        const title =
            stream.session_title ||
            stream.stream_title ||
            "Live now!";

        const category =
            stream.category?.name ||
            "Unknown";

        const viewers =
            stream.viewer_count ?? 0;

        const thumbnail =
            stream.thumbnail?.url ||
            stream.thumbnail ||
            null;

        const embed =
            new EmbedBuilder()
                .setColor(0x53fc18)
                .setTitle(
                    "🔴 iik27 is LIVE!"
                )
                .setURL(
                    `https://kick.com/${username}`
                )
                .setDescription(
                    "**iik27 is currently live on KICK!**"
                )
                .addFields(
                    {
                        name: "📝 Title",
                        value:
                            String(title).slice(
                                0,
                                1024
                            )
                    },
                    {
                        name: "🎮 Category",
                        value:
                            String(category).slice(
                                0,
                                1024
                            ),
                        inline: true
                    },
                    {
                        name: "👀 Viewers",
                        value:
                            String(viewers),
                        inline: true
                    }
                )
                .setTimestamp();

        if (thumbnail) {
            embed.setImage(thumbnail);
        }

        console.log(
            `🔴 ${username} is LIVE!`
        );

        return interaction.editReply({
            embeds: [embed]
        });

    } catch (error) {

        console.error(
            "❌ /livecheck error:",
            error
        );

        return interaction.editReply(
            "❌ Error checking KICK."
        ).catch(() => {});
    }
}

// ==========================================
// /LIVE
// ==========================================

async function handleLive(interaction) {

    await interaction.deferReply({
        ephemeral: true
    });

    try {

        const subcommand =
            interaction.options.getSubcommand();

        // ======================================
        // SETUP
        // ======================================

        if (
            subcommand === "setup"
        ) {

            const link =
                interaction.options.getString(
                    "link"
                );

            const channel =
                interaction.options.getChannel(
                    "channel"
                );

            let url;

            try {

                url = new URL(link);

            } catch {

                return interaction.editReply(
                    "❌ Invalid KICK URL."
                );
            }

            const hostname =
                url.hostname.toLowerCase();

            if (
                hostname !== "kick.com" &&
                hostname !== "www.kick.com"
            ) {

                return interaction.editReply(
                    "❌ Please use a KICK URL."
                );
            }

            const username =
                url.pathname
                    .split("/")
                    .filter(Boolean)[0];

            if (!username) {

                return interaction.editReply(
                    "❌ KICK username not found."
                );
            }

            const config =
                await getGuildConfig(
                    interaction.guildId
                );

            config.kickLive = {
                enabled: true,
                username:
                    username.toLowerCase(),
                channelId:
                    channel.id,
                lastLive: false
            };

            await config.save();

            return interaction.editReply(
                `🔴 **KICK live alerts enabled!**\n\n` +
                `🎥 Streamer: **${username}**\n` +
                `📢 Channel: ${channel}\n` +
                `🔗 https://kick.com/${username}`
            );
        }

        // ======================================
        // DISABLE
        // ======================================

        if (
            subcommand === "disable"
        ) {

            const config =
                await getGuildConfig(
                    interaction.guildId
                );

            if (!config.kickLive) {

                config.kickLive = {
                    enabled: false,
                    username: null,
                    channelId: null,
                    lastLive: false
                };

            } else {

                config.kickLive.enabled =
                    false;

                config.kickLive.lastLive =
                    false;
            }

            await config.save();

            return interaction.editReply(
                "✅ KICK live alerts disabled."
            );
        }

    } catch (error) {

        console.error(
            "❌ /live error:",
            error
        );

        return interaction.editReply(
            "❌ Something went wrong."
        ).catch(() => {});
    }
}

// ==========================================
// INTERACTIONS
// ==========================================

client.on(
    "interactionCreate",
    async interaction => {

        if (
            !interaction.isChatInputCommand()
        ) {
            return;
        }

        console.log(
            `📥 Received /${interaction.commandName}`
        );

        // ======================================
        // AUTOMOD
        // ======================================

        if (
            interaction.commandName ===
            "automod"
        ) {

            // LOCK TO YOUR SERVER

            if (
                interaction.guildId !==
                GUILD_ID
            ) {

                return interaction.reply({
                    content:
                        "❌ AutoMod is only available in the configured server.",
                    ephemeral: true
                });
            }

            const subcommand =
                interaction.options.getSubcommand();

            // ==================================
            // SETUP
            // ==================================

            if (
                subcommand === "setup"
            ) {

                await interaction.deferReply({
                    ephemeral: true
                });

                const result =
                    await setupAutoMod(
                        interaction.guild
                    );

                if (!result.success) {

                    return interaction.editReply(
                        `❌ ${result.message}`
                    );
                }

                return interaction.editReply(
                    `🛡️ **K7Devs AutoMod configured!**\n\n` +
                    `➕ New rules created: **${result.created}**\n` +
                    `🛡️ Your K7Devs rules: **${result.ruleCount}**\n\n` +
                    `✅ Spam protection\n` +
                    `✅ Mention protection\n` +
                    `✅ Profanity filter\n` +
                    `✅ Scam/phishing protection`
                );
            }

            // ==================================
            // DISABLE
            // ==================================

            if (
                subcommand === "disable"
            ) {

                await interaction.deferReply({
                    ephemeral: true
                });

                const result =
                    await disableAutoMod(
                        interaction.guild
                    );

                if (!result.success) {

                    return interaction.editReply(
                        `❌ ${result.message}`
                    );
                }

                return interaction.editReply(
                    `🔕 **K7Devs AutoMod disabled.**\n\n` +
                    `Rules disabled: **${result.disabled}**`
                );
            }

            // ==================================
            // STATUS
            // ==================================

            if (
                subcommand === "status"
            ) {

                await interaction.deferReply({
                    ephemeral: true
                });

                const rules =
                    await getAutoModStatus(
                        interaction.guild
                    );

                if (!rules.length) {

                    return interaction.editReply(
                        "🛡️ **K7Devs AutoMod**\n\nNo K7Devs AutoMod rules have been configured."
                    );
                }

                const lines =
                    rules.map(
                        rule =>
                            `${rule.enabled ? "🟢" : "🔴"} **${rule.name.replace(AUTOMOD_PREFIX, "")}**`
                    );

                return interaction.editReply(
                    `🛡️ **K7Devs AutoMod Status**\n\n` +
                    lines.join("\n")
                );
            }
        }

        // ======================================
        // LIVE
        // ======================================

        if (
            interaction.commandName ===
            "live"
        ) {

            return handleLive(
                interaction
            );
        }

        // ======================================
        // LIVECHECK
        // ======================================

        if (
            interaction.commandName ===
            "livecheck"
        ) {

            return handleLiveCheck(
                interaction
            );
        }

        // ======================================
        // BUSINESS
        // ======================================

        if (
            interaction.commandName ===
            "business"
        ) {

            if (
                !businessCommand ||
                typeof businessCommand.execute !==
                    "function"
            ) {

                return interaction.reply({
                    content:
                        "❌ Business command is unavailable.",
                    ephemeral: true
                });
            }

            try {

                return await businessCommand.execute(
                    interaction
                );

            } catch (error) {

                console.error(
                    "❌ /business error:",
                    error
                );

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    return interaction.editReply(
                        "❌ Something went wrong."
                    ).catch(() => {});

                }

                return interaction.reply({
                    content:
                        "❌ Something went wrong.",
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
);

// ==========================================
// READY
// ==========================================

client.once(
    "ready",
    async () => {

        console.log("");
        console.log(
            "================================"
        );

        console.log(
            "       DISCORD CONNECTED"
        );

        console.log(
            "================================"
        );

        console.log(
            `✅ Logged in as ${client.user.tag}`
        );

        console.log(
            `🌐 Servers: ${client.guilds.cache.size}`
        );

        // ======================================
        // STREAMING
        // ======================================

        client.user.setPresence({

            activities: [
                {
                    name:
                        "Made by iik27",

                    type:
                        ActivityType.Streaming,

                    url:
                        "https://kick.com/iik27"
                }
            ],

            status: "online"
        });

        console.log(
            "🔴 Streaming status enabled!"
        );

        // ======================================
        // REGISTER COMMANDS
        // ======================================

        await registerCommands();

        // ======================================
        // AUTOMOD
        // ======================================

        console.log(
            `🛡️ AutoMod restricted to GUILD_ID: ${GUILD_ID}`
        );

        // ======================================
        // KICK CHECKER
        // ======================================

        try {

            startKickChecker(
                client
            );

            console.log(
                "📺 KICK checker started!"
            );

        } catch (error) {

            console.error(
                "❌ KICK checker failed:",
                error
            );
        }
    }
);

// ==========================================
// DISCORD ERRORS
// ==========================================

client.on(
    "error",
    error => {

        console.error(
            "❌ Discord error:",
            error
        );
    }
);

client.on(
    "warn",
    warning => {

        console.warn(
            "⚠️ Discord warning:",
            warning
        );
    }
);

// ==========================================
// LOGIN
// ==========================================

async function start() {

    try {

        console.log(
            "🚀 Starting Discord bot..."
        );

        console.log(
            "🍃 Connecting to MongoDB..."
        );

        await connectDatabase();

        console.log(
            "✅ MongoDB connected!"
        );

        console.log(
            "🔐 Connecting to Discord..."
        );

        const loginTimeout =
            setTimeout(() => {

                console.error("");
                console.error(
                    "❌ DISCORD LOGIN TIMEOUT"
                );

                console.error(
                    "Discord did not complete the connection within 30 seconds."
                );

                console.error(
                    "Check your DISCORD_TOKEN and Hostinger network configuration."
                );

                process.exit(1);

            }, 30000);

        try {

            await client.login(
                TOKEN
            );

            clearTimeout(
                loginTimeout
            );

        } catch (error) {

            clearTimeout(
                loginTimeout
            );

            throw error;
        }

    } catch (error) {

        console.error("");
        console.error(
            "================================"
        );

        console.error(
            "❌ BOT STARTUP FAILED"
        );

        console.error(
            "================================"
        );

        console.error(error);

        process.exit(1);
    }
}

// ==========================================
// START
// ==========================================

start();
