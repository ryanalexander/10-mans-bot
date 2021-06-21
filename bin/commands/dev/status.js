const app = require("../../../app");
const Command = require('../../lib/Command');

module.exports = class extends Command {

    async execute() {
        let embed = new (this.getCommandManager().discord).MessageEmbed();
        let isActioned = false;

        if(!this.getSender().hasPermission("DEV"))
            return;

        embed.setColor(app.config.personalization.colors.inform_dev);

        if(this.getArgs()[1] !== undefined) {
            switch (this.getArgs()[1].toUpperCase()) {
                case "CONNTEST":
                    let msg = await this.getArg().channel.send('Latency check');
                    msg.delete();
                    embed.setTitle("Connection test")
                    embed.addField("Latency", `${msg.createdTimestamp - this.getArg().createdTimestamp}ms`, true);
                    embed.addField("API Latency", `${Math.round(app.discordClient.ws.ping)}ms`, true);
                    isActioned = true;
                    break;
            }
        }
        if(!isActioned){
            embed.setColor(app.config.personalization.colors.inform_error);
            embed.addField("You're dumb", "You didn't tell me what to do...")
            embed.setFooter(this.getSender().getSnowflake()+" is stoopid");
        }

        this.getChannel().send(embed);
    }
}