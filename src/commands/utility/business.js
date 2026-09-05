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
        .setDescription("Visit the K7Devs business website"),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🌐 K7Devs")
            .setDescription(
                "Looking for professional development services?\n\n" +
                "Visit **K7Devs** to learn more about our services, projects, and business."
            )
            .addFields({
                name: "🔗 Website",
                value: "https://k7devs.com",
                inline: false
            })
            .setFooter({
                text: "K7Devs • Made by iik27"
            })
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("🌐 Visit K7Devs")
                    .setURL("https://k7devs.com")
                    .setStyle(ButtonStyle.Link)
            );

        await interaction.reply({
            embeds: [embed],
            components: [buttons]
        });
    }
};
