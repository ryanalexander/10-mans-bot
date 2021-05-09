const app = require("../../app");
const Command = require('../lib/Command');

module.exports = class extends Command {

    async execute() {
        let embed = new (this.getCommandManager().discord).MessageEmbed();
        let category = "ALL";
        let categories = {
            "ALL": [
                {
                    name: "GAME",
                    type: "CATEGORY",
                    description: "View game related commands",
                    hidden: true
                },
                {
                    name: "QUEUE",
                    type: "CATEGORY",
                    description: "View queue related commands",
                    hidden: true
                },
                {
                    name: "WHOIS @{mention}",
                    type: "COMMAND",
                    description: "View 10s details for players",
                    hidden: false
                }
            ],
            "GAME": [
                {
                    name: "START",
                    type: "COMMAND",
                    description: "Start a game"
                },
                {
                    name: "LIST",
                    type: "COMMAND",
                    description: "List running games"
                },
                {
                    name: "THIS",
                    type: "CATEGORY",
                    description: "Can only be run in game channels. Run for commands"
                }
            ],
            "QUEUE": [
                {
                    name: "OPEN",
                    type: "COMMAND",
                    description: "Open the queue"
                },
                {
                    name: "CLOSE",
                    type: "COMMAND",
                    description: "Close the queue"
                },
                {
                    name: "ADDPLAYER @{mention} [-p]",
                    type: "COMMAND",
                    description: "Add player to queue\n**-p** queue priority"
                },
                {
                    name: "REMPLAYER @{mention}",
                    type: "COMMAND",
                    description: "Remove player from queue"
                }
            ]
        };

        /*
                if(!this.getSender().hasRoleByName("Event Staff") && !this.getSender().hasPermission("DEV"))
                    return;
                if(this.getConfig().type !== "client") {
                    this.getChannel().send(`This is a management Discord. You may only execute '${this.cmd}' in a client Discord!`);
                    return;
                }
         */

        embed.setColor(app.config.personalization.colors.inform_basic);

        if(this.getArgs()[1] !== undefined)
            category = this.getArgs()[1].toUpperCase();

        if(categories[category] === undefined) {
            embed.setTitle("Something isn't quite right...")
            embed.setDescription(`Unknown category specified '${category}'.\n\n**Valid Options**\n${JSON.stringify(Object.keys(categories))}`)
            embed.setColor(app.config.personalization.colors.inform_invalidopt);
        }else {

            embed.setTitle(`Help menu for ${category}`)
            embed.setDescription("This includes all Sub-categories & Commands\n\n")

            categories[category].forEach(field => {
                if(field.hidden && !(this.getSender().hasPermission("DEV") || this.getSender().hasRoleById(this.config))) return;
                embed.addField((field.type==="CATEGORY"?"> ":"") +field.name, field.description, true)
            })
        }

        this.getChannel().send(embed);
    }
}