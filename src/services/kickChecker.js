const axios = require("axios");
const { GuildConfig } = require("../database/mongodb");

const CHECK_INTERVAL = 60 * 1000;

async function getKickChannel(username) {
    try {
        const response = await axios.get(
            `https://kick.com/api/v2/channels/${encodeURIComponent(username)}`,
            {
                headers: {
                    Accept: "application/json",
                    "User-Agent": "Mozilla/5.0 DiscordBot"
                },
                timeout: 10000
            }
        );

        return response.data;
    } catch (error) {
        console.error(
            `❌ KICK check failed for ${username}:`,
            error.response?.status || error.message
        );

        return null;
    }
}

async function checkKick(client) {
    let configs;

    try {
        configs = await GuildConfig.find({
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
    } catch (error) {
        console.error(
            "❌ Failed to load KICK configurations:",
            error
        );
        return;
    }

    console.log(
        `📺 Checking ${configs.length} KICK live configuration(s)...`
    );

    for (const config of configs) {
        try {
            const liveConfig = config.kickLive;

            if (!liveConfig) {
                continue;
            }

            const username = liveConfig.username;

            const data = await getKickChannel(username);

            if (!data) {
                continue;
            }

            const isLive =
                data.livestream !== null &&
                data.livestream !== undefined;

            // ==========================================
            // WENT LIVE
            // ==========================================

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

            // ==========================================
            // WENT OFFLINE
            // ==========================================

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
                `❌ Error checking KICK user for guild ${config.guildId}:`,
                error
            );
        }
    }
}

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
            return;
        }

        const channel =
            guild.channels.cache.get(
                config.kickLive.channelId
            );

        if (!channel) {
            console.log(
                `⚠️ KICK alert channel not found in ${guild.name}.`
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

        const viewerCount =
            livestream.viewer_count ?? 0;

        const thumbnail =
            livestream.thumbnail?.url ||
            livestream.thumbnail ||
            null;

        const kickUrl =
            `https://kick.com/${username}`;

        const embed = {
            color: 0x53fc18,

            title: `🔴 ${username} is LIVE!`,

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
                    value: String(viewerCount),
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
            `📢 KICK live alert sent for ${username}`
        );

    } catch (error) {
        console.error(
            "❌ Failed to send KICK live message:",
            error
        );
    }
}

function startKickChecker(client) {
    console.log(
        "📺 KICK checker started."
    );

    // Check immediately.
    checkKick(client).catch(error => {
        console.error(
            "❌ Initial KICK check failed:",
            error
        );
    });

    // Check every 60 seconds.
    setInterval(() => {
        checkKick(client).catch(error => {
            console.error(
                "❌ KICK scheduled check failed:",
                error
            );
        });
    }, CHECK_INTERVAL);
}

module.exports = {
    startKickChecker,
    checkKick
};
