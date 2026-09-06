const axios = require("axios");

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ActivityType
} = require("discord.js");

const {
    GuildConfig
} = require("../database/mongodb");

const CHECK_INTERVAL = 60 * 1000;

let checkerRunning = false;

// ==========================================
// KICK API
// ==========================================

async function getKickChannel(username) {

    if (!username) {
        return null;
    }

    try {

        const response =
            await axios.get(
                `https://kick.com/api/v2/channels/${encodeURIComponent(username)}`,
                {
                    headers: {
                        Accept:
                            "application/json",

                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36"
                    },

                    timeout: 10000
                }
            );

        return response.data || null;

    } catch (error) {

        console.error(
            `❌ KICK API failed for ${username}:`,
            error.response?.status ||
            error.code ||
            error.message
        );

        return null;
    }
}

// ==========================================
// BOT ACTIVITY
// ==========================================

function setBotActivity(
    client,
    isLive,
    username = "iik27"
) {

    try {

        if (!client?.user) {
            return;
        }

        // ======================================
        // STREAM IS LIVE
        // ======================================

        if (isLive) {

            client.user.setPresence({

                activities: [
                    {
                        name:
                            `${username} on KICK`,

                        type:
                            ActivityType.Streaming,

                        url:
                            `https://kick.com/${encodeURIComponent(username)}`
                    }
                ],

                status:
                    "online"

            });

            console.log(
                `🟣 Discord activity changed: ${username} is LIVE`
            );

            return;
        }

        // ======================================
        // STREAM IS OFFLINE
        // ======================================

        client.user.setPresence({

            activities: [
                {
                    name:
                        "/livecheck",

                    type:
                        ActivityType.Watching
                }
            ],

            status:
                "online"

        });

        console.log(
            "⚫ Discord activity changed: streamer is OFFLINE"
        );

    } catch (error) {

        console.error(
            "❌ Failed to update Discord activity:",
            error
        );

    }
}

// ==========================================
// CHECK KICK
// ==========================================

async function checkKick(client) {

    if (checkerRunning) {
        return;
    }

    checkerRunning = true;

    try {

        const configs =
            await GuildConfig.find({
                "kickLive.enabled": true
            });

        console.log(
            `📺 Checking ${configs.length} KICK live configuration(s)...`
        );

        // ======================================
        // NO CONFIGURATIONS
        // ======================================

        if (!configs.length) {

            setBotActivity(
                client,
                false
            );

            return;
        }

        let someoneIsLive = false;

        let liveUsername = null;

        // ======================================
        // CHECK EVERY CONFIGURATION
        // ======================================

        for (const config of configs) {

            try {

                const liveConfig =
                    config.kickLive;

                if (!liveConfig) {
                    continue;
                }

                const username =
                    String(
                        liveConfig.username || ""
                    )
                        .trim()
                        .toLowerCase();

                if (!username) {
                    continue;
                }

                const data =
                    await getKickChannel(
                        username
                    );

                // ==================================
                // API FAILED
                // ==================================

                if (!data) {

                    console.log(
                        `⚠️ Could not determine status for ${username}.`
                    );

                    continue;
                }

                // ==================================
                // LIVE STATUS
                // ==================================

                const isLive =
                    data.livestream !== null &&
                    data.livestream !== undefined;

                const wasLive =
                    liveConfig.lastLive === true;

                // ==================================
                // SOMEONE IS LIVE
                // ==================================

                if (isLive) {

                    someoneIsLive = true;

                    if (!liveUsername) {
                        liveUsername = username;
                    }

                }

                // ==================================
                // JUST WENT LIVE
                // ==================================

                if (
                    isLive &&
                    !wasLive
                ) {

                    console.log(
                        `🔴 ${username} is LIVE!`
                    );

                    const sent =
                        await sendLiveMessage(
                            client,
                            config,
                            data
                        );

                    /*
                     * Mark as live even if the
                     * Discord alert fails.
                     *
                     * This prevents the checker
                     * from repeatedly treating the
                     * same stream as a new stream.
                     */

                    config.kickLive.lastLive =
                        true;

                    await config.save();

                    if (!sent) {

                        console.log(
                            `⚠️ Live alert failed for ${username}, but live state was saved.`
                        );

                    }

                    continue;
                }

                // ==================================
                // WENT OFFLINE
                // ==================================

                if (
                    !isLive &&
                    wasLive
                ) {

                    console.log(
                        `⚫ ${username} went offline.`
                    );

                    config.kickLive.lastLive =
                        false;

                    await config.save();

                    continue;
                }

                // ==================================
                // NORMAL STATUS
                // ==================================

                console.log(

                    `${isLive ? "🔴" : "⚫"} ${username}: ${
                        isLive
                            ? "LIVE"
                            : "offline"
                    }`

                );

            } catch (error) {

                console.error(

                    `❌ Error checking ${
                        config.kickLive?.username ||
                        "unknown"
                    }:`,
                    
                    error

                );

            }

        }

        // ======================================
        // UPDATE DISCORD ACTIVITY
        // ======================================

        if (someoneIsLive) {

            setBotActivity(
                client,
                true,
                liveUsername || "iik27"
            );

        } else {

            setBotActivity(
                client,
                false
            );

        }

    } catch (error) {

        console.error(
            "❌ KICK checker database error:",
            error
        );

    } finally {

        checkerRunning = false;

    }

}

// ==========================================
// SEND LIVE MESSAGE
// ==========================================

async function sendLiveMessage(
    client,
    config,
    data
) {

    try {

        const guild =
            client.guilds.cache.get(
                config.guildId
            );

        if (!guild) {

            console.error(
                `❌ Guild ${config.guildId} not found.`
            );

            return false;
        }

        const channel =
            guild.channels.cache.get(
                config.kickLive.channelId
            );

        if (!channel) {

            console.error(
                `❌ Alert channel ${config.kickLive.channelId} not found.`
            );

            return false;
        }

        const livestream =
            data?.livestream || {};

        const username =
            String(
                data?.slug ||
                data?.username ||
                config.kickLive?.username ||
                "Streamer"
            );

        const title =
            livestream.session_title ||
            livestream.stream_title ||
            "Live on KICK";

        const category =
            livestream.category?.name ||
            "Unknown";

        const viewers =
            Number(
                livestream.viewer_count ?? 0
            );

        const thumbnail =
            livestream.thumbnail?.url ||
            (
                typeof livestream.thumbnail ===
                "string"
                    ? livestream.thumbnail
                    : null
            );

        const kickUrl =
            `https://kick.com/${encodeURIComponent(username)}`;

        // ======================================
        // EMBED
        // ======================================

        const embed =
            new EmbedBuilder()

                .setColor(
                    0x53fc18
                )

                .setAuthor({
                    name:
                        `${username} is now live on KICK`
                })

                .setTitle(
                    `🔴 ${username} is LIVE!`
                )

                .setURL(
                    kickUrl
                )

                .setDescription(
                    `**${String(title).slice(
                        0,
                        4000
                    )}**`
                )

                .addFields(

                    {
                        name:
                            "🎮 Category",

                        value:
                            `\`${String(category).slice(
                                0,
                                100
                            )}\``,

                        inline:
                            true
                    },

                    {
                        name:
                            "👀 Viewers",

                        value:
                            `\`${viewers.toLocaleString()}\``,

                        inline:
                            true
                    }

                )

                .setFooter({
                    text:
                        "KICK Live Alerts"
                })

                .setTimestamp();

        if (thumbnail) {

            embed.setImage(
                thumbnail
            );

        }

        // ======================================
        // BUTTON
        // ======================================

        const buttons =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()

                        .setLabel(
                            "Watch Stream"
                        )

                        .setEmoji(
                            "🔴"
                        )

                        .setURL(
                            kickUrl
                        )

                        .setStyle(
                            ButtonStyle.Link
                        )

                );

        // ======================================
        // SEND
        // ======================================

        await channel.send({

            content:
                "@everyone",

            allowedMentions: {
                parse: [
                    "everyone"
                ]
            },

            embeds: [
                embed
            ],

            components: [
                buttons
            ]

        });

        console.log(
            `📢 Live alert sent for ${username} in #${channel.name}`
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Failed to send KICK alert:",
            error
        );

        return false;
    }

}

// ==========================================
// START
// ==========================================

function startKickChecker(client) {

    console.log(
        "📺 KICK checker started."
    );

    // ======================================
    // IMMEDIATE CHECK
    // ======================================

    checkKick(client).catch(
        console.error
    );

    // ======================================
    // CHECK EVERY 60 SECONDS
    // ======================================

    setInterval(() => {

        checkKick(client).catch(
            console.error
        );

    }, CHECK_INTERVAL);

}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {

    startKickChecker,

    checkKick,

    getKickChannel

};
