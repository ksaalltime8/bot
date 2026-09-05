const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const { getGuildConfig } =
    require("../../database/mongodb");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("live")
        .setDescription("Manage KICK live alerts")

        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription("Set up KICK live alerts")
                .addStringOption(option =>
                    option
                        .setName("link")
                        .setDescription(
                            "Your KICK channel link"
                        )
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(
                            "Discord channel for live alerts"
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
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    async execute(interaction) {
        try {
            // Acknowledge Discord immediately.
            await interaction.deferReply({
                ephemeral: true
            });

            const subcommand =
                interaction.options.getSubcommand();

            console.log(
                `📺 /live ${subcommand} received`
            );

            const config =
                await getGuildConfig(
                    interaction.guildId
                );

            // ================================
            // SETUP
            // ================================

            if (subcommand === "setup") {
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
                        "❌ Please use a KICK link like `https://kick.com/username`."
                    );
                }

                const username =
                    url.pathname
                        .split("/")
                        .filter(Boolean)[0];

                if (!username) {
                    return interaction.editReply(
                        "❌ I couldn't find the KICK username."
                    );
                }

                // Save ONLY the live-stream settings.
                config.kickLive.enabled = true;

                config.kickLive.username =
                    username.toLowerCase();

                config.kickLive.channelId =
                    channel.id;

                config.kickLive.lastLive = false;

                await config.save();

                console.log(
                    "================================"
                );
                console.log(
                    "📺 KICK LIVE CONFIG SAVED"
                );
                console.log(
                    `Username: ${config.kickLive.username}`
                );
                console.log(
                    `Channel: ${config.kickLive.channelId}`
                );
                console.log(
                    `Enabled: ${config.kickLive.enabled}`
                );
                console.log(
                    "================================"
                );

                return interaction.editReply(
                    `✅ **KICK live alerts enabled!**\n\n` +
                    `🎥 **Streamer:** ${username}\n` +
                    `🔗 **KICK:** https://kick.com/${username}\n` +
                    `📢 **Alert channel:** ${channel}\n\n` +
                    `🔄 Checking every 60 seconds.`
                );
            }

            // ================================
            // DISABLE
            // ================================

            if (subcommand === "disable") {
                config.kickLive.enabled = false;
                config.kickLive.lastLive = false;

                await config.save();

                console.log(
                    `📺 KICK live alerts disabled for ${interaction.guildId}`
                );

                return interaction.editReply(
                    "✅ **KICK live alerts disabled.**"
                );
            }

        } catch (error) {
            console.error(
                "❌ /live command error:",
                error
            );

            try {
                if (
                    interaction.deferred ||
                    interaction.replied
                ) {
                    await interaction.editReply(
                        "❌ Something went wrong. Check the Hostinger console."
                    );
                } else {
                    await interaction.reply({
                        content:
                            "❌ Something went wrong.",
                        ephemeral: true
                    });
                }
            } catch {}
        }
    }
};
