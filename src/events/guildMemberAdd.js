const {
    EmbedBuilder
} = require("discord.js");

const {
    getGuildConfig
} = require("../database/mongodb");

module.exports = {
    name: "guildMemberAdd",

    async execute(member) {
        const config =
            await getGuildConfig(member.guild.id);

        if (
            config.autoRole.enabled &&
            config.autoRole.roleId
        ) {
            const role =
                member.guild.roles.cache.get(
                    config.autoRole.roleId
                );

            if (role) {
                await member.roles
                    .add(role)
                    .catch(() => {});
            }
        }

        if (
            !config.welcome.enabled ||
            !config.welcome.channelId
        ) {
            return;
        }

        const channel =
            member.guild.channels.cache.get(
                config.welcome.channelId
            );

        if (!channel) return;

        const message =
            config.welcome.message
                .replaceAll(
                    "{user}",
                    member.toString()
                )
                .replaceAll(
                    "{server}",
                    member.guild.name
                );

        const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setDescription(message)
            .setThumbnail(
                member.user.displayAvatarURL()
            )
            .setTimestamp();

        await channel.send({
            embeds: [embed]
        }).catch(() => {});
    }
};
