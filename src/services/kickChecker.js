const axios = require("axios");

const {
    GuildConfig
} = require("../database/mongodb");

const CHECK_INTERVAL = 60 * 1000;

async function getKickChannel(username) {
    try {
        const response = await axios.get(
            `https://kick.com/api/v2/channels/${encodeURIComponent(username)}`,
            {
                headers: {
                    Accept: "application/json",
                    "User-Agent":
                        "Mozilla/5.0 DiscordBot"
                },
                timeout: 10000
            }
        );

        return response.data;

    } catch (error) {
        console.error(
            `❌ KICK check failed for ${username}:`,
            error.response?.status ||
            error.message
        );

        return null;
    }
}

async function checkKick(client) {
    try {
        const configs =
            await GuildConfig.find({
                "kickLive.enabled": true,
                "kickLive.username": {
                    $exists: true,
                    $ne: ""
                },
                "kickLive.channelId": {
                    $exists: true,
                    $ne: ""
                }
            });

        console.log(
            `📺 Checking ${configs.length} KICK live configuration(s)...`
        );

        for (const config of configs) {
            try {
                const liveConfig =
                    config.kickLive;

                if (!liveConfig) {
                    continue;
                }

                const username =
                    liveConfig.username;

                const data =
                    await getKickChannel(
                        username
                    );

                if (!data) {
                    continue;
                }

                const isLive =
                    data.livestream !== null &&
                    data.livestream !== undefined;

                // ==============================
                // STREAMER JUST WENT LIVE
                // ==============================

                if (
                    isLive &&
                    !liveConfig.lastLive
                ) {
                    console.log(
                        `🔴 ${username} is LIVE!`
                    );

                    await sendLiveMessage(
                        client,
                        config,
                        data
                    );

                    liveConfig.lastLive = true;

                    await config.save();
                }

                // ==============================
                // STREAMER WENT OFFLINE
                // ==============================

                else if (
                    !isLive &&
                    liveConfig.lastLive
                ) {
                    console.log(
                        `⚫ ${username} went offline.`
                    );

                    liveConfig.lastLive = false;

                    await config.save();
                }

            } catch (error) {
                console.error(
                    `❌ Error checking ${config.kickLive?.username}:`,
                    error
                );
            }
        }

    } catch (error) {
        console.error(
            "❌ KICK checker database error:",
            error
        );
    }
}

async function sendLiveMessage(
    client,
    config,
    data
) {
    const guild =
        client.guilds.cache.get(
            config.guildId
        );

    if (!guild) {
        console.log(
            `⚠️ Guild ${config.guildId} not found.`
        );
        return;
    }

    const channel =
        guild.channels.cache.get(
            config.kickLive.channelId
        );

    if (!channel) {
        console.log(
            `⚠️ Alert channel not found in ${guild.name}.`
        );
        return;
    }

    const livestream =
        data.livestream || {};

    const username =
        data.slug ||
        data.username ||
        config.kickLive.username;

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
        livestream.thumbnail ||
        null;

    const kickUrl =
        `https://kick.com/${username}`;

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
                value: String(category),
                inline: true
            },
            {
                name: "👀 Viewers",
                value: String(viewers),
                inline: true
            },
            {
                name: "📝 Title",
                value: String(title),
                inline: false
            }
        ],

        footer: {
            text: "KICK Live Alert"
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
        `📢 Live alert sent for ${username}`
    );
}

function startKickChecker(client) {
    console.log(
        "📺 KICK checker started."
    );

    // First check immediately.
    checkKick(client).catch(
        console.error
    );

    // Then every 60 seconds.
    setInterval(() => {
        checkKick(client).catch(
            console.error
        );
    }, CHECK_INTERVAL);
}

module.exports = {
    startKickChecker,
    checkKick
};
