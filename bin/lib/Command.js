const CommandSender = require("./CommandSender");
const CommandManager = require("../managers/CommandManager");
const app = require("../../app");
const {MessageEmbed} = require("discord.js");

module.exports = class {

    /**
     * Interface for an executed command
     * @param {CommandManager} commandManager instance of CommandManager for project
     * @param {GuildMember} member Discord.JS Guild Member
     * @param {GuildChannel} channel Discord.JS Channel Object
     * @param {Message} cmd Discord.JS Message Object
     * @param {String} arg Issued command in text format
     * @param {String[]} args Array of arguments after command
     */
    constructor(commandManager, member, channel, cmd, arg, args) {
        this.commandManager = commandManager;
        this.member = member;
        this.channel = channel;
        this.cmd = cmd;
        this.arg = arg;
        this.args = args;

        let execute = this.execute(member, channel, cmd, arg, args);
        if(execute !== undefined)
            execute.catch(e => {
            app.discordClient.channels.resolve(app.config.debugging.error_channel)
                .send(new MessageEmbed()
                    .setColor("RED")
                    .setTitle("Something has gone wrong")
                    .addField("Command", cmd)
                    .addField("Message", arg)
                    .addField("Error", e.code)
                    .addField("Stack Trace", `\`\`\`${e}\`\`\``)
                );
        });
    }

    /**
     * Method executed when command is executed. To be overridden by Command
     */
    execute() {
    }

    /**
     * Get CommandManager object
     * @returns {*}
     */
    getCommandManager() {
        return this.commandManager;
    }

    /**
     *
     * @returns {CommandSender}
     */
    getSender() {
        return this.member;
    }

    getChannel() {
        return this.channel;
    }

    getGuild() {
        return this.channel.guild;
    }

    getCmd() {
        return this.cmd;
    }

    getArg() {
        return this.arg;
    }

    getArgs() {
        return this.args;
    }
}