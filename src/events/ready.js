module.exports = {
    name: "ready",
    once: true,

    execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`🌐 Serving ${client.guilds.cache.size} server(s)`);

const { Client, GatewayIntentBits, ActivityType } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    client.user.setPresence({
        activities: [{
            name: 'iik27',
            type: ActivityType.Streaming,
            url: 'https://kick.com/iik27'
        }],
        status: 'online',
    });



    }
};
