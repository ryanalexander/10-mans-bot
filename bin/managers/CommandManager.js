
const fs = require("fs");
const CommandSender = require("../lib/CommandSender");
const app = require("../../app");
const {MessageEmbed} = require("discord.js");

module.exports = class {

    constructor(discord, client, config) {
        this.discord = discord;
        this.client = client;
        this.config = config;
    }

    handle(message) {
        var sender = new CommandSender(message.member);
        var name = message.content.substr(1, message.length).split(" ")[0];
        try {
            if (fs.existsSync(`./bin/commands/${name}.js`)) {
                new (require(`../commands/${name}.js`))(this, sender, message.channel, name, message, message.content.substr(1, message.length).split(" "));
                message.delete();
            }
        }catch (e) {
            console.log(e);
        }
    }

    getApplication() {
        return app;
    }

    getDiscord() {
        return this.discord;
    }

    getClient() {
        return this.client;
    }

    getConfig() {
        return this.config;
    }
}