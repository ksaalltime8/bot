const fs = require("fs");
const path = require("path");

function loadEvents(client) {
    const eventsPath = path.join(process.cwd(), "src", "events");

    if (!fs.existsSync(eventsPath)) return;

    for (const file of fs.readdirSync(eventsPath)) {
        if (!file.endsWith(".js")) continue;

        const event = require(path.join(eventsPath, file));

        if (!event.name || !event.execute) continue;

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

module.exports = { loadEvents };
