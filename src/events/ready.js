module.exports = {
    name: "ready",
    once: true,

    execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`🌐 Serving ${client.guilds.cache.size} server(s)`);

        client.user.setPresence({
            activities: [
                {
                    name: "/help, Made by iik27",
                    type: 0
                }
            ],
            status: "streaming"
        });
    }
};
