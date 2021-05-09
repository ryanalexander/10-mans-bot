const app = require("../../../app");
const Command = require('../../lib/Command');

module.exports = class extends Command {

    async execute() {
        let embed = new (this.getCommandManager().discord).MessageEmbed();

        if(!this.getSender().hasPermission("DEV"))
            return;

        embed.setColor(app.config.personalization.colors.inform_dev);

        if(this.getArgs()[1] !== undefined) {
            switch (this.getArgs()[1].toUpperCase()) {
                case "CONNTEST":

                    break;
            }
        }else {
            embed.setColor(app.config.personalization.colors.inform_error);
            embed.addField("You're dumb", "You didn't tell me what to do...")
            embed.setFooter(this.getSender().id+" is stoopid");
        }

        this.getChannel().send(embed);
    }
}