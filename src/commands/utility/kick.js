const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const {
    getGuildConfig
} = require("../../database/mongodb");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("live")
        .setDescription(
            "Configure KICK live alerts."
        )

        .addSubcommand(command =>
            command
                .setName("setup")
                .setDescription(
                    "Set up KICK live alerts."
                )

                .addStringOption(option =>
                    option
                        .setName("link")
                        .setDescription(
                            "Your KICK channel URL"
                        )
                        .setRequired(true)
                )

                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(
                            "Discord channel for alerts"
                        )
                        .setRequired(true)
                )
        )

        .addSubcommand(command =>
            command
                .setName("disable")
                .setDescription(
                    "Disable KICK live alerts."
                )
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    async execute(interaction) {
        const config =
            await getGuildConfig(
                interaction.guild.id
            );

        const subcommand =
            interaction.options.getSubcommand();

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
                return interaction.reply({
                    content:
                        "❌ Invalid URL.",
                    ephemeral: true
                });
            }

            if (
                url.hostname !==
                    "kick.com" &&
                url.hostname !==
                    "www.kick.com"
            ) {
                return interaction.reply({
                    content:
                        "❌ Use a KICK link like `https://kick.com/username`.",
                    ephemeral: true
                });
            }

            const username =
                url.pathname
                    .split("/")
                    .filter(Boolean)[0];

            if (!username) {
                return interaction.reply({
                    content:
                        "❌ I couldn't find your KICK username.",
                    ephemeral: true
                });
            }

            config.kick.enabled = true;

            config.kick.username =
                username.toLowerCase();

            config.kick.channelId =
                channel.id;

            /*
             * Reset notification state.
             */
            config.kick.lastLive = false;

            await config.save();

            return interaction.reply({
                content:
                    `✅ **KICK alerts enabled!**\n\n` +
                    `📺 KICK: **${username}**\n` +
                    `📢 Alerts: ${channel}\n` +
                    `🔄 Checking every **60 seconds**.`
            });
        }

        if (subcommand === "disable") {
            config.kick.enabled = false;

            config.kick.lastLive = false;

            await config.save();

            return interaction.reply({
                content:
                    "✅ KICK alerts disabled."
            });
        }
    }
};
