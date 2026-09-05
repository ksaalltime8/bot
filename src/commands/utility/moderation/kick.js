const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to kick")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.KickMembers
        ),

    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const reason =
            interaction.options.getString("reason") ||
            "No reason provided";

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member) {
            return interaction.reply({
                content: "❌ That member isn't in this server.",
                ephemeral: true
            });
        }

        if (!member.kickable) {
            return interaction.reply({
                content: "❌ I can't kick that member. Check my role position and permissions.",
                ephemeral: true
            });
        }

        await member.kick(reason);

        await interaction.reply(
            `👢 **${user.tag}** was kicked.\nReason: **${reason}**`
        );
    }
};
