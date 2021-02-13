const app = require("../../app");
const Command = require('../lib/Command');

module.exports = class extends Command {

    async execute() {
        let embed = new (this.getCommandManager().discord).MessageEmbed();

        if(this.getArgs().length > 1) {
            switch (this.getArgs()[1].toUpperCase()){
                case "PING":
                    embed.addField("Pong!", (new Date()).getTime() + " | " + this.getArg().createdTimestamp)
                    break;
                case "RESOLVEALL":
                    this.getChannel().send("This is going to take a while...");
                    let players = await app.database.client.execute("SELECT * FROM players ALLOW FILTERING");
                    this.getChannel().send("Fetched "+players.rows.length+" player records. Migrating now");
                    var i = 0;
                    setInterval(()=>{
                        let player = players.rows[i];
                        if(player === undefined)
                            return;
                        app.discordClient.users.fetch(player.discord_id).then(user => {
                            app.database.client.execute(`UPDATE players SET "displayName" = ? WHERE snowflake = ?`, [user.username, player.snowflake]);
                        });
                        if(i === players.rows.length-1) {
                            clearInterval(this);
                            this.getChannel().send("Finished migrating "+players.rows.length+" users");
                        }
                        i++;
                    },250);

                    return;
            }
        }

        embed.addField("Name", this.getSender().getUsername());
        embed.addField("Developer", this.getSender().hasPermission("DEV"));
        embed.addField("Random Identifier", this.getCommandManager().getApplication().snowflake.generateSnowflake(""));


        this.getChannel().send(embed);
    }
}