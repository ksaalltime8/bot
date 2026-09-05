const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const axios = require("axios");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("livecheck")
        .setDescription("Check if iik27 is currently live on KICK"),

    async execute(interaction) {

        // Respond immediately so Discord doesn't timeout
        await interaction.deferReply();

        try {

            const username = "iik27";

            console.log(
                `📺 Checking KICK live status for ${username}...`
            );

            const response = await axios.get(
                `https://kick.com/api/v2/channels/${username}`,
                {
                    headers: {
                        Accept: "application/json",
                        "User-Agent": "Mozilla/5.0 DiscordBot"
                    },
                    timeout: 10000
                }
            );

            const data = response.data;

            const isLive =
                data &&
                data.livestream !== null &&
                data.livestream !== undefined;

            // ======================================
            // OFFLINE
            // ======================================

            if (!isLive) {

                console.log(
                    `⚫ ${username} is not live.`
                );

                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x2b2d31)
                            .setTitle("⚫ KICK Live Check")
                            .setDescription(
                                `**${username} is not live right now.**`
                            )
                            .setURL(
                                `https://kick.com/${username}`
                            )
                            .setFooter({
                                text: "K7Devs • KICK Live Check"
                            })
                            .setTimestamp()
                    ]
                });
            }

            // ======================================
            // LIVE
            // ======================================

            const livestream =
                data.livestream || {};

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

            const embed =
                new EmbedBuilder()
                    .setColor(0x53fc18)
                    .setTitle("🔴 iik27 is LIVE!")
                    .setURL(
                        `https://kick.com/${username}`
                    )
                    .setDescription(
                        `**${username} is currently live on KICK!**`
                    )
                    .addFields(
                        {
                            name: "📝 Title",
                            value: title,
                            inline: false
                        },
                        {
                            name: "🎮 Category",
                            value: category,
                            inline: true
                        },
                        {
                            name: "👀 Viewers",
                            value: String(viewers),
                            inline: true
                        }
                    )
                    .setFooter({
                        text: "K7Devs • KICK Live Check"
                    })
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
                "❌ /livecheck failed:"
            );

            console.error(
                error.response?.status ||
                error.message
            );

            return interaction.editReply(
                "❌ I couldn't check KICK right now. Please try again in a moment."
            );
        }
    }
};
