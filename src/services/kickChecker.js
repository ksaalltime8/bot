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
    const configs = await GuildConfig.find({
        "kick.enabled": true,
        "kick.username": {
            $ne: null
        },
        "kick.channelId": {
            $ne: null
        }
    });

    for (const config of configs) {
        try {
            const username =
                config.kick.username;

            const data =
                await getKickChannel(username);

            if (!data) {
                continue;
            }

            const livestream =
                data.livestream || null;

            const isLive =
                data.livestream !== null &&
                data.livestream !== undefined;

            /*
             * User just went LIVE.
             */
            if (
                isLive &&
                !config.kick.lastLive
            ) {
                await sendLiveMessage(
                    client,
                    config,
                    data
                );

                config.kick.lastLive = true;

                await config.save();

                console.log(
                    `🔴 ${username} is LIVE`
                );
            }

            /*
             * User went OFFLINE.
             */
            else if (
                !isLive &&
                config.kick.lastLive
            ) {
                config.kick.lastLive = false;

                await config.save();

                console.log(
                    `⚫ ${username} is offline`
                );
            }
        } catch (error) {
            console.error(
                `❌ Error checking ${config.kick.username}:`,
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
            config.kick.channelId
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
        config.kick.username;

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
                value: category,
                inline: true
            },

            {
                name: "👀 Viewers",
                value: String(viewerCount),
                inline: true
            },

            {
                name: "📝 Title",
                value: title,
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
}

function startKickChecker(client) {
    console.log(
        "📺 KICK checker started."
    );

    /*
     * Check immediately.
     */
    checkKick(client).catch(console.error);

    /*
     * Then every 60 seconds.
     */
    setInterval(
        () => {
            checkKick(client).catch(
                console.error
            );
        },
        CHECK_INTERVAL
    );
}

module.exports = {
    startKickChecker
};
