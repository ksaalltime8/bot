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
    throw new Error(
        "DISCORD_TOKEN is missing."
    );
}

if (!CLIENT_ID) {
    throw new Error(
        "CLIENT_ID is missing."
    );
}

if (!GUILD_ID) {
    throw new Error(
        "GUILD_ID is missing."
    );
}

if (!process.env.MONGODB_URI) {
    throw new Error(
        "MONGODB_URI is missing."
    );
}

// ==========================================
// WEB SERVER
// ==========================================

const server = http.createServer(
    (req, res) => {

        res.writeHead(200, {
            "Content-Type":
                "text/plain"
        });

        res.end(
            "K7Devs Discord bot is online!"
        );
    }
);

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
// COMMANDS
// ==========================================

// ------------------------------------------
// /LIVE
// ------------------------------------------

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

// ------------------------------------------
// /LIVECHECK
// ------------------------------------------

const liveCheckCommand =
    new SlashCommandBuilder()
        .setName("livecheck")
        .setDescription(
            "Check if iik27 is live on KICK"
        );

// ------------------------------------------
// /AUTOMOD
// ------------------------------------------

const autoModCommand =
    new SlashCommandBuilder()
        .setName("automod")
        .setDescription(
            "Manage AutoMod for this server"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription(
                    "Enable AutoMod protection"
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
// BUSINESS COMMAND
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

for (
    const command of commands
) {

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

const AUTOMOD_PREFIX =
    "K7Devs AutoMod |";

// ==========================================
// GET AUTOMOD RULES
// ==========================================

async function fetchAutoModRules(guild) {

    try {

        return await guild
            .autoModerationRules
            .fetch();

    } catch (error) {

        console.error(
            "❌ AutoMod fetch failed:"
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
// AUTOMOD SETUP
// ==========================================

async function setupAutoMod(guild) {

    // --------------------------------------
    // SERVER CHECK
    // --------------------------------------

    if (!guild) {

        return {
            success: false,
            message: "Guild not found.",
            created: 0,
            rules: []
        };
    }

    if (
        guild.id !== GUILD_ID
    ) {

        return {
            success: false,
            message:
                "AutoMod is only available in the configured server.",
            created: 0,
            rules: []
        };
    }

    console.log(
        "🛡️ Starting AutoMod setup..."
    );

    // --------------------------------------
    // BOT MEMBER
    // --------------------------------------

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
                "Could not fetch the bot member.",
            created: 0,
            rules: []
        };
    }

    // --------------------------------------
    // PERMISSION
    // --------------------------------------

    if (
        !me.permissions.has(
            PermissionFlagsBits.ManageGuild
        )
    ) {

        return {
            success: false,
            message:
                "The bot needs **Manage Server** permission.",
            created: 0,
            rules: []
        };
    }

    // --------------------------------------
    // GET RULES
    // --------------------------------------

    let rules =
        await fetchAutoModRules(guild);

    if (!rules) {

        return {
            success: false,
            message:
                "I couldn't access Discord AutoMod.",
            created: 0,
            rules: []
        };
    }

    console.log(
        `🛡️ Existing AutoMod rules: ${rules.size}`
    );

    let created = 0;

    // ======================================
    // HELPER
    // ======================================

    async function createRule(
        name,
        data
    ) {

        const currentRules =
            await fetchAutoModRules(
                guild
            );

        if (!currentRules) {
            return null;
        }

        const existing =
            currentRules.find(
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

            const rule =
                await guild
                    .autoModerationRules
                    .create({
                        name,
                        ...data
                    });

            created++;

            console.log(
                `✅ Created: ${name}`
            );

            return rule;

        } catch (error) {

            console.error(
                `❌ Failed: ${name}`
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

    // ======================================
    // SPAM
    // ======================================

    await createRule(
        `${AUTOMOD_PREFIX} Spam`,
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
                "K7Devs AutoMod"
        }
    );

    // ======================================
    // MENTION SPAM
    // ======================================

    await createRule(
        `${AUTOMOD_PREFIX} Mention Spam`,
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
                "K7Devs AutoMod"
        }
    );

    // ======================================
    // PROFANITY
    // ======================================

    await createRule(
        `${AUTOMOD_PREFIX} Profanity`,
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
                "K7Devs AutoMod"
        }
    );

    // ======================================
    // SCAM KEYWORDS
    // ======================================

    await createRule(
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
                    "claim nitro",
                    "free steam",
                    "steam gift",
                    "verify your account",
                    "verify account",
                    "login to claim",
                    "free gift card",
                    "gift card giveaway"
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
                "K7Devs AutoMod"
        }
    );

    // ======================================
    // FINAL FETCH
    // ======================================

    rules =
        await fetchAutoModRules(
            guild
        );

    if (!rules) {

        return {
            success: true,
            created,
            rules: [],
            ruleCount: 0
        };
    }

    const ownedRules =
        [...rules.values()].filter(
            rule =>
                rule.name.startsWith(
                    AUTOMOD_PREFIX
                )
        );

    console.log(
        `🛡️ K7Devs AutoMod rules: ${ownedRules.length}`
    );

    console.log(
        `➕ Created this time: ${created}`
    );

    return {
        success: true,
        created,
        rules: ownedRules,
        ruleCount: ownedRules.length
    };
}

// ==========================================
// AUTOMOD DISABLE
// ==========================================

async function disableAutoMod(guild) {

    if (
        !guild ||
        guild.id !== GUILD_ID
    ) {

        return {
            success: false,
            message:
                "AutoMod is only available in the configured server.",
            disabled: 0
        };
    }

    const rules =
        await fetchAutoModRules(
            guild
        );

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
                `🔴 Disabled: ${rule.name}`
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

async function automodStatus(guild) {

    if (
        !guild ||
        guild.id !== GUILD_ID
    ) {

        return [];
    }

    const rules =
        await fetchAutoModRules(
            guild
        );

    if (!rules) {

        return [];
    }

    return [
        ...rules.values()
    ].filter(
        rule =>
            rule.name.startsWith(
                AUTOMOD_PREFIX
            )
    );
}

// ==========================================
// KICK API
// ==========================================

async function getKickChannel(
    username
) {

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

async function handleLiveCheck(
    interaction
) {

    try {

        await interaction.deferReply();

        const username = "iik27";

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

            embed.setImage(
                thumbnail
            );
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

        if (
            interaction.deferred ||
            interaction.replied
        ) {

            return interaction.editReply(
                "❌ Error checking KICK."
            ).catch(() => {});

        }

        return interaction.reply({
            content:
                "❌ Error checking KICK.",
            ephemeral: true
        }).catch(() => {});
    }
}

// ==========================================
// /LIVE
// ==========================================

async function handleLive(
    interaction
) {

    try {

        await interaction.deferReply({
            ephemeral: true
        });

        const subcommand =
            interaction.options.getSubcommand();

        // ------------------------------------
        // SETUP
        // ------------------------------------

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

        // ------------------------------------
        // DISABLE
        // ------------------------------------

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

        if (
            interaction.deferred ||
            interaction.replied
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

// ==========================================
// INTERACTIONS
// ==========================================

client.on(
    "interactionCreate",
    async interaction => {

        // Only slash commands
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

            if (
                interaction.guildId !==
                GUILD_ID
            ) {

                return interaction.reply({
                    content:
                        "❌ AutoMod is only available in the configured server.",
                    ephemeral: true
                }).catch(() => {});
            }

            const subcommand =
                interaction.options.getSubcommand();

            try {

                // ------------------------------
                // SETUP
                // ------------------------------

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

                // ------------------------------
                // DISABLE
                // ------------------------------

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

                // ------------------------------
                // STATUS
                // ------------------------------

                if (
                    subcommand === "status"
                ) {

                    await interaction.deferReply({
                        ephemeral: true
                    });

                    const rules =
                        await automodStatus(
                            interaction.guild
                        );

                    if (!rules.length) {

                        return interaction.editReply(
                            "🛡️ **K7Devs AutoMod**\n\nNo K7Devs AutoMod rules found."
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

            } catch (error) {

                console.error(
                    "❌ AUTOMOD ERROR:"
                );

                console.error(error);

                const errorMessage =
                    error?.message ||
                    "Unknown AutoMod error.";

                if (
                    interaction.deferred ||
                    interaction.replied
                ) {

                    return interaction.editReply(
                        `❌ AutoMod error:\n\`${errorMessage.slice(0, 1500)}\``
                    ).catch(() => {});

                }

                return interaction.reply({
                    content:
                        `❌ AutoMod error:\n\`${errorMessage.slice(0, 1500)}\``,
                    ephemeral: true
                }).catch(() => {});
            }

            return;
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

        console.log(
            `🛡️ AutoMod restricted to: ${GUILD_ID}`
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
