const app = require("../../app");
const GuildQueue = require("../lib/GuildQueue");
const {MessageEmbed} = require("discord.js");
const Game = require("../lib/Game");

const TIME_PERIODS = [
    604800000, 2419200000, 3628800000, 60480000000000
]
const BAN_REASONS = ["NOSHOW", "TOXICITY", "GRIEFING", "LEAVING", "NOMIC"];
const BAN_DURATIONS = {
    NOSHOW: [TIME_PERIODS[0], TIME_PERIODS[1], TIME_PERIODS[2], TIME_PERIODS[TIME_PERIODS.length]],
    TOXICITY: [TIME_PERIODS[1], TIME_PERIODS[TIME_PERIODS.length]],
    GRIEFING: [TIME_PERIODS[1], TIME_PERIODS[TIME_PERIODS.length]],
    LEAVING: [TIME_PERIODS[1], TIME_PERIODS[TIME_PERIODS.length]],
    NOMIC: [TIME_PERIODS[1], TIME_PERIODS[TIME_PERIODS.length]],
    OTHER: []
};

module.exports = class extends require('../lib/Command') {
    async execute() {

        if (!this.getSender().hasRoleByName("10 Mans Staff"))
            return;

        let user = this.getArg().mentions.members.first();
        let player = await app.database.getPlayerOrCreate(user.id);
        let staff = await app.database.getPlayerByDiscord(this.getSender().getSnowflake());
        let isPardon = this.getArgs().find(arg => (arg.toUpperCase() === "PARDON" || arg.toUpperCase() === "REMOVE"))
        let isLookup = this.getArgs().find(arg => (arg.toUpperCase() === "LOOKUP" || arg.toUpperCase() === "FIND"))
        let action = (isPardon ? "PARDON" : isLookup ? "LOOKUP" : "BLACKLIST");

        switch (action) {
            case "BLACKLIST":
                let reason = this.getArgs().find(arg => BAN_REASONS.indexOf(arg.toUpperCase())>-1).toUpperCase();
                await app.database.blacklistPlayer(player, staff, reason, BAN_DURATIONS[reason][0])
                await user.roles.add(this.getGuild().roles.cache.find(role => role.name === "10 Mans Blacklist"));
                this.getChannel().send(new MessageEmbed().setColor("BLURPLE").setTitle("10 Mans Blacklist").setDescription(`Successfully blacklisted ${user.displayName} for ${reason}`));
                break;
            case "PARDON":
                break;
            case "LOOKUP":
                let punishments = await app.database.getPunishments(player);
                let embed = new MessageEmbed().setColor("BLURPLE").setTitle("Punishment history for "+user.displayName);
                for(let i = 0; i < punishments.rows.length; i++){
                    let punishment = punishments.rows[i];
                    let staff = await app.database.getPlayerBySnowflake(punishment.staff);
                    let date = new Date(punishment.expires);
                    embed.addField(punishment.reason, `Punishment Id ${punishment.snowflake}\nPunished by <@${staff.discord_id}>\nExpires ${date.toString()}`)
                }
                this.getChannel().send(embed);
                break;
        }

    }
}