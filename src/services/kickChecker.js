```js
const axios = require("axios");

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
        const response = await axios.get(
            `https://kick.com/api/v2/channels/${encodeURIComponent(username)}`,
            {
                headers: {
                    Accept: "application/json",
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36"
                },
                timeout: 10000,
                validateStatus: status =>
                    status >= 200 && status < 300
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
// CHECK ALL GUILDS
// ==========================================

async function checkKick(client) {
    if (checkerRunning) {
        console.log(
            "⏳ Previous KICK check is still running. Skipping this cycle."
        );
        return;
    }

    checkerRunning = true;

    try {
        const configs = await GuildConfig.find({
            "kickLive.enabled": true,
            "kickLive.username": {
                $exists: true,
                $nin: ["", null]
            },
            "kickLive.channelId": {
                $exists: true,
                $nin: ["", null]
            }
        });

        console.log(
            `📺 Checking ${configs.length} KICK live configuration(s)...`
        );

        for (const config of configs) {
            try {
                const liveConfig = config.kickLive;

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
                    await getKickChannel(username);

                // Don't change lastLive when KICK
                // cannot be reached.
                if (!data) {
                    continue;
                }

                const isLive =
                    data.livestream !== null &&
                    data.livestream !== undefined;

                const wasLive =
                    liveConfig.lastLive === true;

                // ======================================
                // JUST WENT LIVE
                // ======================================

                if (isLive && !wasLive) {
                    console.log(
                        `🔴 ${username} is LIVE!`
                    );

                    const sent =
                        await sendLiveMessage(
                            client,
                            config,
                            data
                        );

                    // Only mark as live after the
                    // alert was successfully sent.
                    if (sent) {
                        config.kickLive.lastLive = true;

                        await config.save();

                        console.log(
                            `✅ ${username} live state saved.`
                        );
                    }

                    continue;
                }

                // ======================================
                // WENT OFFLINE
                // ======================================

                if (!isLive && wasLive) {
                    console.log(
                        `⚫ ${username} went offline.`
                    );

                    config.kickLive.lastLive = false;

                    await config.save();

                    console.log(
                        `✅ ${username} offline state saved.`
                    );

                    continue;
                }

                // ======================================
                // NO STATE CHANGE
                // ======================================

                console.log(
                    `${isLive ? "🔴" : "⚫"} ${username}: ${
                        isLive ? "LIVE" : "offline"
                    }`
                );

            } catch (error) {
                console.error(
                    `❌ Error checking ${config.kickLive?.username || "unknown streamer"}:`,
                    error
                );
            }
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
// SEND LIVE ALERT
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
            console.log(
                `⚠️ Guild ${config.guildId} not found.`
            );

            return false;
        }

        const channelId =
            config.kickLive?.channelId;

        if (!channelId) {
            console.log(
                `⚠️ No alert channel configured for ${guild.name}.`
            );

            return false;
        }

        const channel =
            guild.channels.cache.get(
                channelId
            );

        if (!channel) {
            console.log(
                `⚠️ Alert channel ${channelId} not found in ${guild.name}.`
            );

            return false;
        }

        // Make sure the channel supports sending.
        if (
            typeof channel.send !==
            "function"
        ) {
            console.log(
                `⚠️ Channel ${channel.name} cannot receive messages.`
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
            "Live now!";

        const category =
            livestream.category?.name ||
            "Unknown";

        const viewers =
            livestream.viewer_count ?? 0;

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

        const embed = {
            color: 0x53fc18,

            title:
                `🔴 ${username} is LIVE!`,

            url: kickUrl,

            description:
                `**${username}** just went live on KICK!`,

            fields: [
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
                },
                {
                    name: "📝 Title",
                    value:
                        String(title).slice(
                            0,
                            1024
                        ),
                    inline: false
                }
            ],

            footer: {
                text: "KICK Live Alert • K7Devs"
            },

            timestamp:
                new Date().toISOString()
        };

        if (thumbnail) {
            embed.image = {
                url: thumbnail
            };
        }

        await channel.send({
            content:
                `🔴 **${username} is LIVE!**\n${kickUrl}`,

            embeds: [embed]
        });

        console.log(
            `📢 Live alert sent for ${username} in #${channel.name}`
        );

        return true;

    } catch (error) {
        console.error(
            `❌ Failed to send KICK alert for ${config.kickLive?.username || "unknown"}:`,
            error
        );

        return false;
    }
}

// ==========================================
// START CHECKER
// ==========================================

function startKickChecker(client) {
    console.log(
        "📺 KICK checker started."
    );

    // First check immediately.
    checkKick(client).catch(error => {
        console.error(
            "❌ Initial KICK check failed:",
            error
        );
    });

    // Then check every 60 seconds.
    setInterval(() => {
        checkKick(client).catch(error => {
            console.error(
                "❌ Scheduled KICK check failed:",
                error
            );
        });
    }, CHECK_INTERVAL);
}

module.exports = {
    startKickChecker,
    checkKick
};
```
