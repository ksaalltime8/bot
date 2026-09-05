const mongoose = require("mongoose");

const guildConfigSchema = new mongoose.Schema(
    {
        guildId: {
            type: String,
            required: true,
            unique: true
        },

        kickLive: {
            enabled: {
                type: Boolean,
                default: false
            },

            username: {
                type: String,
                default: ""
            },

            channelId: {
                type: String,
                default: ""
            },

            lastLive: {
                type: Boolean,
                default: false
            }
        }
    },
    {
        timestamps: true
    }
);

const GuildConfig =
    mongoose.models.GuildConfig ||
    mongoose.model(
        "GuildConfig",
        guildConfigSchema
    );

async function connectDatabase() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error(
            "MONGODB_URI is missing."
        );
    }

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
    });
}

async function getGuildConfig(guildId) {
    return GuildConfig.findOneAndUpdate(
        { guildId },
        {
            $setOnInsert: {
                guildId
            }
        },
        {
            new: true,
            upsert: true
        }
    );
}

module.exports = {
    GuildConfig,
    connectDatabase,
    getGuildConfig
};
