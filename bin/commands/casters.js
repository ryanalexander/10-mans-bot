const app = require("../../app");
const GuildQueue = require("../lib/GuildQueue");
const {MessageEmbed} = require("discord.js");
const Game = require("../lib/Game");

module.exports = class extends require('../lib/Command') {
    async execute() {

        if (!this.getSender().hasRoleByName("Management") && !this.getArg().guild.id === "746962575710879765") {
            console.log("Player attempted to execute command which they cannot execute");
            return;
        }

        let isCreate = this.getArgs().find(arg => (arg.toUpperCase() === "CREATE"))
        let isSetTag = this.getArgs().find(arg => (arg.toUpperCase() === "SETTAG"))
        let isGetkey = this.getArgs().find(arg => (arg.toUpperCase() === "GETKEY"))
        let channel = this.getArgs().find(arg => (arg.toString().match(/(?!info|create|casters|getkey)^[a-zA-Z0-9]{4,25}$/gm)))
        let userId = (this.getArg().mentions.members.array().length>0?this.getArg().mentions.members.first():this.getSender().member).user.id;

        let player = await app.database.getPlayerOrCreate(userId);

        let caster = await app.database.getCasterOrCreate(player.snowflake, channel);
        let action = (isCreate ? "CREATE" : isSetTag?"SETTAG":isGetkey?"GETKEY":"INFO")
        let embed = new MessageEmbed().setColor("BURPLE");

        switch (action) {
            case "INFO":
                this.getChannel().send(embed.setTitle("Caster info").addField("Twitch", caster.twitch));
                break;
            case "CREATE":
                this.getChannel().send("OK");
                break;
            case "SETTAG":
                if(this.getArgs().length < 2){
                    this.getChannel().send("Usage: .casters settag riotid#tagline");
                    return;
                }
                this.getChannel().send(embed.setTitle("Account association").addField("Linked you with", this.getArgs()[2]));
                app.database.associateRiot(player.snowflake, this.getArgs()[2].split("#"));
                break;
            case "GETKEY":
                let uuid = CreateGuid();
                app.database.createApiKey(player.snowflake, uuid);
                this.getSender().member.user.send(new MessageEmbed().setColor("BLURPLE").setTitle("API Keys").setDescription(`Here is your api key - ${uuid}`).setFooter("Treat this like a password and do not send it to anyone!"));
                break;
        }

    }
}

function CreateGuid() {
    function _p8(s) {
        var p = (Math.random().toString(16)+"000000000").substr(2,8);
        return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
    }
    return _p8() + _p8(true) + _p8(true) + _p8();
}