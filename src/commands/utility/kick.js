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
        .setDescription("Manage KICK live alerts")

        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription("Set your KICK live alert")
                .addStringOption(option =>
                    option
                        .setName("link")
                        .setDescription("Your KICK channel link")
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Discord channel for the alert")
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("disable")
                .setDescription("Disable KICK live alerts")
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    async execute(interaction) {
        try {
            const config = await getGuildConfig(
                interaction.guild.id
            );

            const action =
                interaction.options.getSubcommand();

            if (action === "setup") {
                const link =
                    interaction.options.getString("link");

                const channel =
                    interaction.options.getChannel("channel");

                let url;

                try {
                    url = new URL(link);
                } catch {
                    return interaction.reply({
                        content: "❌ Invalid KICK URL.",
                        ephemeral: true
                    });
                }

                if (
                    url.hostname !== "kick.com" &&
                    url.hostname !== "www.kick.com"
                ) {
                    return interaction.reply({
                        content:
                            "❌ Use a KICK link such as `https://kick.com/username`.",
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
                            "❌ Couldn't find the KICK username.",
                        ephemeral: true
                    });
                }

                config.kick.enabled = true;
                config.kick.username =
                    username.toLowerCase();

                config.kick.channelId =
                    channel.id;

                config.kick.lastLive = false;

                await config.save();

                return interaction.reply({
                    content:
                        `✅ **KICK live alerts enabled!**\n\n` +
                        `🎥 Streamer: **${username}**\n` +
                        `📢 Alert channel: ${channel}\n` +
                        `🔄 Checking every 60 seconds.`
                });
            }

            if (action === "disable") {
                config.kick.enabled = false;
                config.kick.lastLive = false;

                await config.save();

                return interaction.reply({
                    content:
                        "✅ **KICK live alerts disabled.**"
                });
            }

        } catch (error) {
            console.error("LIVE COMMAND ERROR:", error);

            if (!interaction.replied) {
                await interaction.reply({
                    content:
                        "❌ Something went wrong. Check the bot logs.",
                    ephemeral: true
                });
            }
        }
    }
};
