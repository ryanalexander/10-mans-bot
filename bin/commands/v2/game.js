const app = require("../../../app");
const Command = require('../../lib/Command');
const GuildQueue = require("../../lib/GuildQueue");
const Game = require("../../lib/Game");

module.exports = class extends Command {


    static actions = {
        START_GAME: (instance, embed)=>{
            if(instance.getCommandManager().getApplication().queuemap[instance.getGuild().id] === undefined){
                embed.setColor(app.config.personalization.colors.inform_error);
                embed.setDescription("Failed to find open queue.")
                return;
            }
            let queue = instance.getCommandManager().getApplication().queuemap[instance.getGuild().id];

            if(queue.getQueueMembers().length < 10 && instance.getArg().content.indexOf("-f") <= -1) {
                embed.setColor(app.config.personalization.colors.inform_error);
                embed.setDescription(`Minimum player requirement not met.`)
                embed.addField("Current Players", queue.getQueueMembers().length, true)
                embed.addField("Required Players", 10, true)
                return;
            }
            if(queue.getQueueMembers().length < 4) {
                embed.setColor(app.config.personalization.colors.inform_error);
                embed.setDescription(`Minimum player requirement not met.`)
                embed.addField("Current Players", queue.getQueueMembers().length, true)
                embed.addField("Required Players", 4, true)
                return;
            }

            let players = [];
            for(let i = 0; i < queue.getQueueMembers().length && i <= 9; i++)
                players.push(queue.getQueueMembers()[i]);
            queue.removeAllFromQueue(players);
            let game = new Game(instance.getGuild(), players);
            embed.setDescription("Game started!")
            embed.addField("Identifier", game.snowflake, true);
            embed.addField("Time", new Date(), true);
            embed.addField("Players",`<@${players.join(">\n<@")}`, false)

        }
    };

    async execute() {
        let embed = new (this.getCommandManager().discord).MessageEmbed();

        if(this.getConfig().type !== "client") {
            this.getChannel().send("This is a management Discord. You may only execute `game` in a client Discord!");
            return;
        }
        if(!this.getSender().hasRoleById(this.getConfig().supportRole) && !this.getSender().hasPermission("DEV"))
            return;

        embed.setColor(app.config.personalization.colors.inform_basic);
        embed.setTitle("Game Management");

        if(this.getArgs().length > 1) {
            switch (this.getArgs()[1].toUpperCase()) {
                case "START":
                    module.exports.actions.START_GAME(this,embed);
                    break;
                case "LIST":
                    embed.setDescription("List running games")
                    break;
                case "THIS":
                    embed.setDescription("Manage current game")
                    break;
            }
        }else {
            embed.setColor(app.config.personalization.colors.inform_error);
            embed.setDescription("Unknown argument. Try `.help game`")
        }

        this.getChannel().send(embed);
    }
}