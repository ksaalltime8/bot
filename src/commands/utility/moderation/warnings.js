const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const {
    Warning
} = require("../../../database/mongodb");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("View a member's warnings.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        ),

    async execute(interaction) {
        const user =
            interaction.options.getUser("user");

        const warnings =
            await Warning.find({
                guildId: interaction.guild.id,
                userId: user.id
            })
            .sort({ createdAt: -1 })
            .limit(10);

        if (!warnings.length) {
            return interaction.reply(
                `✅ **${user.tag}** has no warnings.`
            );
        }

        const description = warnings
            .map((warning, index) => {
                return [
                    `**${index + 1}.** ${warning.reason}`,
                    `Moderator: <@${warning.moderatorId}>`,
                    `<t:${Math.floor(
                        warning.createdAt.getTime() / 1000
                    )}:R>`
                ].join(" • ");
            })
            .join("\n\n");

        const embed = new EmbedBuilder()
            .setColor(0xffcc00)
            .setTitle(`⚠️ Warnings — ${user.tag}`)
            .setDescription(description)
            .setFooter({
                text: `Showing ${warnings.length} warning(s)`
            });

        await interaction.reply({
            embeds: [embed]
        });
    }
};
