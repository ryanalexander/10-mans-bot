
const Command = require('../lib/Command');
const {MessageEmbed} = require("discord.js");
const app = require("../../app");

module.exports = class extends Command {

    async execute() {

        let action = this.getArgs()[1].toUpperCase();
        let embed = new MessageEmbed().setColor("BLURPLE");

        switch(action) {
            case "CREATE": // .events create
                let payload = JSON.parse(this.getArg().toString('utf-8').substr(15, this.getArg().length));
                embed.setTitle("Created event")
                embed.setDescription(`**Event Title** \`\`${payload.title}\`\`\n**Event Time** \`\`${new Date(payload.timestamp)}\`\``)

                await app.database.registerEvent(payload.title, new Date(1504095567183).toLocaleDateString("en-US"));
                break;
            case "LIST":
                let events = await app.database.getUpcomingEvents();

                embed.setTitle("Upcoming events");

                events.rows.forEach(event => {
                    embed.addField(event.title, event.time)
                })

                break;
        }

        if(embed.title !== undefined)
            this.getChannel().send(embed);

    }
}