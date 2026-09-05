module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        if (!interaction.isButton()) return;

        if (interaction.customId === "ping_button") {
            await interaction.reply({
                content: "🏓 Pong!",
                ephemeral: true
            });
        }
    }
};
