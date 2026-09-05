const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const {
    Warning
} = require("../../../database/mongodb");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to warn")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        ),

    async execute(interaction) {
        const user =
            interaction.options.getUser("user");

        const reason =
            interaction.options.getString("reason");

        await Warning.create({
            guildId: interaction.guild.id,
            userId: user.id,
            moderatorId: interaction.user.id,
            reason
        });

        const count =
            await Warning.countDocuments({
                guildId: interaction.guild.id,
                userId: user.id
            });

        await interaction.reply(
            `⚠️ **${user.tag}** has been warned.\n` +
            `Reason: **${reason}**\n` +
            `Total warnings: **${count}**`
        );
    }
};
