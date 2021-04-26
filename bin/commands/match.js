const app = require("../../app");
const Command = require('../lib/Command');

module.exports = class extends Command {

    async execute() {
        let embed = new (this.getCommandManager().discord).MessageEmbed();

        let match = this.getArgs().length>1?this.getArgs()[1].toUpperCase():"";
        if(match == "") {
            this.getChannel().send("Unknown match");
            return;
        }

        let match_obj = await this.database.getMatchById(Number(match));


        this.getChannel().send(embed);
    }
}