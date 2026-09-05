const mongoose = require("mongoose");

const guildConfigSchema = new mongoose.Schema(
    {
        guildId: {
            type: String,
            required: true,
            unique: true
        },

        // Discord moderation system
        kick: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        // KICK.COM live system
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
    if (!process.env.MONGODB_URI) {
        throw new Error(
            "MONGODB_URI is missing."
        );
    }

    await mongoose.connect(
        process.env.MONGODB_URI,
        {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000
        }
    );
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
