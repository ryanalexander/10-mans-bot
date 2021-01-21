const app = require("../../app");
const GuildQueue = require("../lib/GuildQueue");
const {MessageEmbed} = require("discord.js");
const Game = require("../lib/Game");

module.exports = class extends require('../lib/Command') {
    async execute() {

        let member = this.getArg().mentions.members.first()!=null?this.getArg().mentions.members.first():this.getSender();
        let player = await app.database.getPlayerOrCreate(member.user.id)
        let matches = await app.database.getMatchesByPlayer(player.snowflake);
        let punishments = await app.database.getPunishments(player);
        let accounts = await app.database.getLinkedAccounts(player);
        let embed = new MessageEmbed().setColor("BLURPLE");

        embed.setAuthor(member.displayName, member.user.defaultAvatarURL);

        embed.addField("First match", player.first_seen !== undefined? player.first_seen : "hasn't played", true);
        embed.addField("Total games", matches.rows.length, true);
        embed.addField("Total blacklists", punishments.rows.length, true);

        embed.addField("Linked accounts", (()=>{
            let reply = "";
            accounts.rows.forEach(account =>
                reply += `${account.riot_name}#${account.riot_tagline}\n`
            );
            return reply;
        })())

        embed.setFooter(player.snowflake)

        this.getChannel().send(embed);

    }
}