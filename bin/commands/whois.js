const app = require("../../app");
const Command = require('../lib/Command');
const zlip = require('zlib');
let roles = ["EVENT_STAFF","EVENT_CASTER","MANAGEMENT"];

module.exports = class extends Command {

    async execute() {
        let embed = new (this.getCommandManager().discord).MessageEmbed();

        embed.setColor(app.config.personalization.colors.inform_basic);

        let target = null;

        if(this.getMentions('MEMBERS').first() !== undefined) {
            target = this.getMentions('MEMBERS').first().user.id;
        }else if(this.getArgs()[1] !== undefined && !isNaN(this.getArgs()[1])) {
            target = this.getArgs()[1];
        }else {
            target = this.getSender().member.id;
        }

        let player = await app.database.getPlayerByDiscord(target)
        let member = await app.discordClient.users.resolve(target);
        let caster = (await app.database.getCasterByPlayer(player.snowflake)).first();

        if(player === null) {
            embed.setColor(app.config.personalization.colors.inform_error);
            embed.setDescription(`No record found for <@${target}>!`)
        }else {
            let staff = (await app.database.getStaffByPlayer(player.snowflake)).first();
            let matches = await app.database.getMatchesByPlayer(player.snowflake);

            embed.setAuthor(player.displayName, member.avatarURL({size:16}));

            if(this.config.webSupport) {
                embed.setURL(`https://events.oce.gg/10s/players?player=${player.snowflake}`);
                embed.setDescription(`Want to see more stats for ${player.displayName}?\n[Click here to view profile](https://events.oce.gg/10s/players?player=${player.snowflake})`)
            }

            if(staff !== null || caster !== null)
                embed.addField("Staff", staff!==null?roles[staff.position]:roles[1], true)
            embed.addField("Total Matches", matches.rows.length, true);

            if(matches.rows.length > 0) {
                let recentMatches = "";
                let matchList = matches.rows.slice(0,5);
                let matchSfList = [];
                matchList.forEach(match => {
                    matchSfList.push(Number(match.game_snowflake));
                });
                matchList = await app.database.getMatches(matchSfList);

                matchList.forEach(match => {
                    let d = new Date(match.started);
                    var dateFormatted = ("0" + d.getDate()).slice(-2) + "/" + ("0"+(d.getMonth()+1)).slice(-2) + "/" +
                        d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
                    recentMatches += `${this.config.webSupport?`[View](https://events.oce.gg/10s/games?game=${match.snowflake})`:""} __${match.map}__ @ \`${dateFormatted}\`${matchList.indexOf(match)>=matchList.length?"":"\n"}`
                })

                embed.addField("Recent Matches (Max 5)", recentMatches, false);
                embed.setThumbnail("https://cdn.discordapp.com/attachments/767649316281516054/838366634124247051/transperant.png?"+zlip.deflateSync(JSON.stringify({
                    player:player,
                    caster:caster,
                    staff:staff,
                    matches:matchList
                })).toString('base64'))

            }
        }

        this.getChannel().send(embed);
    }
}