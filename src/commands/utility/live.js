const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

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
                            "Discord channel for alerts"
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

        /*
         * IMPORTANT:
         *
         * Defer immediately.
         *
         * This prevents:
         *
         * "The application did not respond"
         *
         * while MongoDB/KICK processing happens.
         */

        await interaction.deferReply({
            ephemeral: true
        });

        try {

            const subcommand =
                interaction.options.getSubcommand();

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

                let url;

                try {
                    url = new URL(link);
                } catch {

                    return interaction.editReply(
                        "❌ That isn't a valid URL."
                    );
                }

                if (
                    url.hostname !== "kick.com" &&
                    url.hostname !== "www.kick.com"
                ) {

                    return interaction.editReply(
                        "❌ Please provide a KICK link such as `https://kick.com/username`."
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

                // ==================================
                // DATABASE
                // ==================================

                let getGuildConfig;

                try {

                    ({
                        getGuildConfig
                    } = require(
                        "../../database/mongodb"
                    ));

                } catch (error) {

                    console.error(
                        "MongoDB module error:",
                        error
                    );

                    return interaction.editReply(
                        "❌ MongoDB module could not be loaded."
                    );
                }

                if (
                    typeof getGuildConfig !==
                    "function"
                ) {

                    console.error(
                        "getGuildConfig() does not exist in database/mongodb.js"
                    );

                    return interaction.editReply(
                        "❌ MongoDB configuration function is missing."
                    );
                }

                const config =
                    await getGuildConfig(
                        interaction.guildId
                    );

                if (!config.kick) {
                    config.kick = {};
                }

                config.kick.enabled = true;

                config.kick.username =
                    username.toLowerCase();

                config.kick.channelId =
                    channel.id;

                config.kick.lastLive = false;

                await config.save();

                return interaction.editReply(
                    `✅ **KICK live alerts enabled!**\n\n` +
                    `🎥 **KICK:** https://kick.com/${username}\n` +
                    `📢 **Alert channel:** ${channel}\n` +
                    `🔄 **Checking:** every 60 seconds`
                );
            }

            // ======================================
            // DISABLE
            // ======================================

            if (subcommand === "disable") {

                let getGuildConfig;

                try {

                    ({
                        getGuildConfig
                    } = require(
                        "../../database/mongodb"
                    ));

                } catch (error) {

                    console.error(error);

                    return interaction.editReply(
                        "❌ MongoDB module could not be loaded."
                    );
                }

                const config =
                    await getGuildConfig(
                        interaction.guildId
                    );

                if (!config.kick) {
                    config.kick = {};
                }

                config.kick.enabled = false;

                config.kick.lastLive = false;

                await config.save();

                return interaction.editReply(
                    "✅ **KICK live alerts disabled.**"
                );
            }

        } catch (error) {

            console.error(
                "❌ /live ERROR:"
            );

            console.error(error);

            return interaction.editReply(
                "❌ Something went wrong while configuring KICK live alerts."
            ).catch(() => {});
        }
    }
};
