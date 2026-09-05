const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check whether the bot is online."),

    async execute(interaction) {
        const latency = Date.now() - interaction.createdTimestamp;

        await interaction.reply(
            `🏓 Pong! Bot latency: **${latency}ms**`
        );
    }
};
