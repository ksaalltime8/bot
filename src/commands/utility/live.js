const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const {
    getGuildConfig
} = require("../../database/mongodb");

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
                        .setDescription(
                            "KICK channel URL"
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
        ),

    async execute(interaction) {

        console.log(
            `📥 /live received from ${interaction.user.tag}`
        );

        // IMPORTANT:
        // Reply immediately so Discord never
        // shows "The application did not respond".
        await interaction.deferReply({
            ephemeral: true
        });

        try {

            const subcommand =
                interaction.options.getSubcommand();

            console.log(
                `📺 /live ${subcommand}`
            );

            // ======================================
            // SETUP
            // ======================================

            if (subcommand === "setup") {

                const link =
                    interaction.options.getString(
                        "link"
                    );

                const channel =
                    interaction.options.getChannel(
                        "channel"
                    );

                console.log(
                    `🔗 KICK link: ${link}`
                );

                console.log(
                    `📢 Discord channel: ${channel.id}`
                );

                let url;

                try {

                    url = new URL(link);

                } catch {

                    return interaction.editReply(
                        "❌ Invalid KICK URL."
                    );
                }

                if (
                    url.hostname !== "kick.com" &&
                    url.hostname !== "www.kick.com"
                ) {

                    return interaction.editReply(
                        "❌ Please use a KICK URL like `https://kick.com/username`."
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

                console.log(
                    `👤 KICK username: ${username}`
                );

                // ==================================
                // DATABASE
                // ==================================

                console.log(
                    "🍃 Loading guild configuration..."
                );

                const config =
                    await getGuildConfig(
                        interaction.guildId
                    );

                if (!config) {

                    throw new Error(
                        "Could not create guild configuration."
                    );
                }

                // ==================================
                // SAVE KICK LIVE SETTINGS
                // ==================================

                config.kickLive = {
                    enabled: true,

                    username:
                        username.toLowerCase(),

                    channelId:
                        channel.id,

                    lastLive: false
                };

                await config.save();

                console.log(
                    "✅ KICK configuration saved."
                );

                return interaction.editReply(
                    "🔴 **KICK live alerts enabled!**\n\n" +
                    `🎥 **Streamer:** ${username}\n` +
                    `📢 **Alert channel:** ${channel}\n` +
                    `🔗 **KICK:** https://kick.com/${username}\n\n` +
                    "🔄 Checking every 60 seconds."
                );
            }

            // ======================================
            // DISABLE
            // ======================================

            if (subcommand === "disable") {

                console.log(
                    "🛑 Disabling KICK alerts..."
                );

                const config =
                    await getGuildConfig(
                        interaction.guildId
                    );

                config.kickLive.enabled = false;
                config.kickLive.lastLive = false;

                await config.save();

                return interaction.editReply(
                    "✅ **KICK live alerts disabled.**"
                );
            }

            return interaction.editReply(
                "❌ Unknown `/live` option."
            );

        } catch (error) {

            console.error(
                "❌ /live FAILED:"
            );

            console.error(error);

            try {

                return interaction.editReply(
                    "❌ `/live` encountered an error. Check the Hostinger logs."
                );

            } catch {

                return;
            }
        }
    }
};
