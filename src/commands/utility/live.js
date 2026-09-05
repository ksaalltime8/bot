const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} = require("discord.js");

const { getGuildConfig } = require("../../database/mongodb");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("live")
        .setDescription("Manage KICK live alerts")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription("Set up KICK live alerts")
                .addStringOption(option =>
                    option
                        .setName("link")
                        .setDescription("KICK channel URL")
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Channel for live alerts")
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
                .setDescription("Disable KICK live alerts")
        ),

    async execute(interaction) {
        // ACKNOWLEDGE DISCORD IMMEDIATELY
        await interaction.deferReply({
            ephemeral: true
        });

        try {
            const action =
                interaction.options.getSubcommand();

            console.log(
                `📺 /live ${action} from ${interaction.user.tag}`
            );

            // ============================
            // SETUP
            // ============================

            if (action === "setup") {
                const link =
                    interaction.options.getString("link");

                const channel =
                    interaction.options.getChannel("channel");

                let url;

                try {
                    url = new URL(link);
                } catch {
                    return interaction.editReply(
                        "❌ Invalid URL. Example: `https://kick.com/username`"
                    );
                }

                const host =
                    url.hostname.toLowerCase();

                if (
                    host !== "kick.com" &&
                    host !== "www.kick.com"
                ) {
                    return interaction.editReply(
                        "❌ Please provide a valid KICK.com channel URL."
                    );
                }

                const username =
                    url.pathname
                        .split("/")
                        .filter(Boolean)[0];

                if (!username) {
                    return interaction.editReply(
                        "❌ Could not find the KICK username."
                    );
                }

                console.log(
                    `📺 Setting KICK streamer: ${username}`
                );

                // Get/create guild configuration
                const config =
                    await getGuildConfig(
                        interaction.guildId
                    );

                // IMPORTANT:
                // kickLive is for the KICK LIVE system.
                // kick is kept separate for /kick moderation.
                config.kickLive = {
                    enabled: true,
                    username:
                        username.toLowerCase(),
                    channelId: channel.id,
                    lastLive: false
                };

                await config.save();

                console.log(
                    `✅ Saved KICK live configuration for ${username}`
                );

                return interaction.editReply(
                    `## 🔴 KICK Live Alerts Enabled\n\n` +
                    `🎥 **Streamer:** ${username}\n` +
                    `📢 **Channel:** ${channel}\n` +
                    `🔗 **KICK:** https://kick.com/${username}\n\n` +
                    `✅ I will check the streamer every 60 seconds.`
                );
            }

            // ============================
            // DISABLE
            // ============================

            if (action === "disable") {
                const config =
                    await getGuildConfig(
                        interaction.guildId
                    );

                config.kickLive.enabled = false;
                config.kickLive.lastLive = false;

                await config.save();

                console.log(
                    "🛑 KICK live alerts disabled"
                );

                return interaction.editReply(
                    "✅ **KICK live alerts disabled.**"
                );
            }

        } catch (error) {
            console.error(
                "❌ /live ERROR:",
                error
            );

            try {
                await interaction.editReply(
                    "❌ Something went wrong while setting up KICK live alerts."
                );
            } catch {}
        }
    }
};
