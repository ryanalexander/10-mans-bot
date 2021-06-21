
const Command = require('../lib/Command');
const {MessageEmbed} = require("discord.js");
const app = require("../../app");

module.exports = class extends Command {

    async execute() {

        let embed = new MessageEmbed().setColor("BLURPLE");
        let arg = this.getArgs()[1]!==undefined?this.getArgs()[1].toUpperCase():"HELP";

        switch (arg) {
            case "HELP":
                this.getChannel().send("Help menu")
                break;
            default:
                if(this.getArg("MEMBER")) {
                    console.log(this.getArg("MEMBER"))
                }else {
                    console.log("huh")
                }
                break;
        }

    }
}