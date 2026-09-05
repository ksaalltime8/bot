module.exports = {
    name: "ready",
    once: true,

    execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`🌐 Serving ${client.guilds.cache.size} server(s)`);

 client.user.setPresence({
    activities: [
        {
            name: "K7Devs Live",
            type: 1,
            url: "https://k7devs.com"
        }
    ],
    status: "online"
});


    }
};
