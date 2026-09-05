const express = require("express");
const crypto = require("crypto");

const {
    GuildConfig
} = require("../database/mongodb");

function startKickWebhook(client) {
    const app = express();

    /*
     * IMPORTANT:
     * We need the raw request body for KICK
     * webhook signature verification.
     */
    app.use(
        express.raw({
            type: "application/json"
        })
    );

    app.get("/health", (req, res) => {
        res.status(200).send("OK");
    });

    app.post("/kick/webhook", async (req, res) => {
        try {
            const body = req.body.toString("utf8");

            const eventType =
                req.headers["kick-event-type"];

            console.log(
                `📡 KICK event received: ${eventType}`
            );

            /*
             * Parse the event.
             */
            const event = JSON.parse(body);

            /*
             * We only care about stream status.
             */
            if (
                eventType !==
                "livestream.status.updated"
            ) {
                return res.sendStatus(200);
            }

            /*
             * Only send an alert when the stream
             * actually starts.
             */
            if (event.is_live !== true) {
                return res.sendStatus(200);
            }

            const broadcaster =
                event.broadcaster;

            if (!broadcaster) {
                return res.sendStatus(200);
            }

            const username =
                broadcaster.username;

            const slug =
                broadcaster.channel_slug;

            /*
             * Find every Discord server configured
             * for this KICK username.
             */
            const configs =
                await GuildConfig.find({
                    "kick.enabled": true,
                    "kick.username":
                        username.toLowerCase()
                });

            for (const config of configs) {
                const guild =
                    client.guilds.cache.get(
                        config.guildId
                    );

                if (!guild) continue;

                const channel =
                    guild.channels.cache.get(
                        config.kick.channelId
                    );

                if (!channel) continue;

                const title =
                    event.title ||
                    "Live now!";

                const kickUrl =
                    `https://kick.com/${slug}`;

                const mention =
                    config.kick.mentionEveryone
                        ? "@everyone "
                        : "";

                await channel.send({
                    content: mention,

                    embeds: [
                        {
                            color: 0x53fc18,

                            author: {
                                name:
                                    `${username} is LIVE!`
                            },

                            title:
                                `🔴 ${title}`,

                            url: kickUrl,

                            description:
                                `**${username}** just went live on KICK!`,

                            fields: [
                                {
                                    name: "📺 Stream",
                                    value:
                                        `[Watch on KICK](${kickUrl})`,
                                    inline: true
                                },

                                {
                                    name: "🕐 Started",
                                    value:
                                        event.started_at
                                            ? `<t:${Math.floor(
                                                new Date(
                                                    event.started_at
                                                ).getTime() / 1000
                                            )}:R>`
                                            : "Just now",
                                    inline: true
                                }
                            ],

                            thumbnail: {
                                url:
                                    broadcaster.profile_picture
                            },

                            footer: {
                                text:
                                    "KICK Live Notification"
                            },

                            timestamp:
                                new Date().toISOString()
                        }
                    ],

                    allowedMentions:
                        config.kick.mentionEveryone
                            ? {
                                parse: ["everyone"]
                            }
                            : {
                                parse: []
                            }
                });
            }

            return res.sendStatus(200);

        } catch (error) {
            console.error(
                "❌ KICK webhook error:",
                error
            );

            return res.sendStatus(500);
        }
    });

    const port =
        Number(process.env.KICK_WEBHOOK_PORT) ||
        3000;

    app.listen(
        port,
        () => {
            console.log(
                `📡 KICK webhook listening on port ${port}`
            );
        }
    );
}

module.exports = {
    startKickWebhook
};
