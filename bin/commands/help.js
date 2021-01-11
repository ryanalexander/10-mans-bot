
const Command = require('../lib/Command');

module.exports = class extends Command {

    execute() {
        let embed = new (this.getCommandManager().discord).MessageEmbed();

        embed.addField("Name", this.getSender().getUsername());
        embed.addField("Developer", this.getSender().hasPermission("DEV"));


        this.getChannel().send(embed);
    }
}