const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Delete messages.")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Number of messages to delete")
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        ),

    async execute(interaction) {
        const amount = interaction.options.getInteger("amount");

        const deleted = await interaction.channel.bulkDelete(
            amount,
            true
        );

        await interaction.reply({
            content: `🧹 Deleted **${deleted.size}** message(s).`,
            ephemeral: true
        });
    }
};
