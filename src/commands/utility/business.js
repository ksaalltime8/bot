const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("business")
        .setDescription(
            "Visit the K7Devs business website"
        ),

    async execute(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("🌐 K7Devs")
                .setDescription(
                    "Visit our website to learn more about K7Devs."
                )
                .setURL("https://k7devs.com")
                .setFooter({
                    text: "K7Devs • Made by iik27"
                });

            const button = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel("Visit Website")
                        .setEmoji("🌐")
                        .setURL("https://k7devs.com")
                        .setStyle(ButtonStyle.Link)
                );

            const response = {
                embeds: [embed],
                components: [button]
            };

            // Already acknowledged by index.js
            if (
                interaction.deferred ||
                interaction.replied
            ) {
                return await interaction.editReply(
                    response
                );
            }

            // Not acknowledged yet
            return await interaction.reply(
                response
            );

        } catch (error) {
            console.error(
                "❌ /business failed:",
                error
            );

            try {
                if (
                    interaction.deferred ||
                    interaction.replied
                ) {
                    await interaction.editReply({
                        content:
                            "❌ Business command failed.",
                        embeds: [],
                        components: []
                    });
                } else {
                    await interaction.reply({
                        content:
                            "❌ Business command failed.",
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error(
                    "❌ Could not send error response:",
                    replyError
                );
            }
        }
    }
};
