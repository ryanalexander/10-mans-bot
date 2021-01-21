const app = require("../../app");
const GuildQueue = require("../lib/GuildQueue");
const {MessageEmbed} = require("discord.js");
const Game = require("../lib/Game");

module.exports = class extends require('../lib/Command') {
    async execute() {

        if (!this.getSender().hasRoleByName("Management"))
            return;

        let user = this.getArg().mentions.members.first();
        let isCreate = this.getArgs().find(arg => (arg.toUpperCase() === "CREATE"))
        let channel = this.getArgs().find(arg => (arg.toString().match(/(?!info)^[a-zA-Z0-9]{4,25}$/gm)))
        let caster = await app.database.getCasterOrCreate(user.id, channel);
        let action = (isCreate ? "CREATE" : "INFO")
        let embed = new MessageEmbed().setColor("BURPLE");

        switch (action) {
            case "INFO":
                this.getChannel().send(embed.setTitle("Caster info").addField("Twitch", caster.twitch));
                break;
        }

    }
}