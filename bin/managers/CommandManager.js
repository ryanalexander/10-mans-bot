
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

        if(message.guild === null)
            return;

        // Prevent replying to messages not known
        if(this.config.guilds[message.guild.id]!==undefined && this.config.guilds[message.guild.id].commandChannels !== undefined && this.config.guilds[message.guild.id].commandChannels.indexOf(message.channel.id)>0)
            return;

        try {
            if (fs.existsSync(`./bin/commands/${name}.js`)) {

                if(this.config.guilds[message.guild.id] === undefined){
                    message.channel.send("Hmm. I don't recognise this server. Please speak to Aspy#0001 to be whitelisted.");
                    this.client.channels.fetch(this.config.debugging.screaming_channel).then(channel => {
                        channel.send(
                            new MessageEmbed()
                                .setColor("ORANGE")
                                .setTitle("Unrecognised Discord")
                                .setDescription("Someone attempted to run a command in a server i don't know!")
                                .addField("Guild Name", message.guild.name)
                                .addField("Guild Owner", `${message.guild.owner.user.username}#${message.guild.owner.user.discriminator}`)
                                .addField("Guild Size", `${message.guild.memberCount}`)
                                .setFooter(`Guild snowflake | ${message.guild.id}`)
                        )
                    })
                    return;
                }

                new (require(`../commands/${name}.js`))(this, sender, message.channel, name, message, message.content.substr(1, message.length).split(" "), this.getConfig().guilds[message.guild.id]);
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