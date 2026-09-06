```js
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
        // Acknowledge Discord immediately.
        // This prevents "This application did not respond".
        await interaction.deferReply();

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

            await interaction.editReply({
                embeds: [embed],
                components: [button]
            });

            console.log("✅ /business responded successfully.");

        } catch (error) {
            console.error("❌ /business failed:", error);

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: "❌ Business command failed."
                }).catch(console.error);
            } else {
                await interaction.reply({
                    content: "❌ Business command failed.",
                    ephemeral: true
                }).catch(console.error);
            }
        }
    }
};
```
