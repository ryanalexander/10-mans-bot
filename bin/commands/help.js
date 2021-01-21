
const Command = require('../lib/Command');

module.exports = class extends Command {

    execute() {
        let embed = new (this.getCommandManager().discord).MessageEmbed();

        embed.addField("Name", this.getSender().getUsername());
        embed.addField("Developer", this.getSender().hasPermission("DEV"));
        embed.addField("Random Identifier", this.getCommandManager().getApplication().snowflake.generateSnowflake(""));


        this.getChannel().send(embed);
    }
}