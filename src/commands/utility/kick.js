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
        .setDescription("Configure KICK live alerts.")

        .addSubcommand(subcommand =>
            subcommand
                .setName("setup")
                .setDescription("Set up KICK live alerts.")
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
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
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

        // /live setup
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
                        "❌ That isn't a valid URL.",
                    ephemeral: true
                });
            }

            if (
                url.hostname !== "kick.com" &&
                url.hostname !== "www.kick.com"
            ) {
                return interaction.reply({
                    content:
                        "❌ Please use a KICK link like `https://kick.com/username`.",
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
                        "❌ I couldn't find the KICK username.",
                    ephemeral: true
                });
            }

            config.kick.enabled = true;
            config.kick.username =
                username.toLowerCase();

            config.kick.channelId =
                channel.id;

            // Make sure a new live session
            // can trigger an alert.
            config.kick.lastLive = false;

            await config.save();

            return interaction.reply({
                content:
                    `✅ **Live alerts enabled!**\n\n` +
                    `🎥 KICK: **${username}**\n` +
                    `📢 Alert channel: ${channel}\n` +
                    `🔄 Checking every **60 seconds**.\n\n` +
                    `When ${username} goes live, I'll send an alert here.`
            });
        }

        // /live disable
        if (subcommand === "disable") {
            config.kick.enabled = false;
            config.kick.lastLive = false;

            await config.save();

            return interaction.reply({
                content:
                    "✅ **Live alerts disabled.**"
            });
        }
    }
};
