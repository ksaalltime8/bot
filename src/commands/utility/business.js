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
                })
                .setTimestamp();

            const button = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel("Visit Website")
                        .setEmoji("🌐")
                        .setURL("https://k7devs.com")
                        .setStyle(ButtonStyle.Link)
                );

            return await interaction.editReply({
                embeds: [embed],
                components: [button]
            });

        } catch (error) {
            console.error(
                "❌ /business failed:",
                error
            );

            return interaction.editReply({
                content: "❌ Business command failed.",
                embeds: [],
                components: []
            }).catch(() => {});
        }
    }
};
