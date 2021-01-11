const CommandSender = require("./CommandSender");
const CommandManager = require("../managers/CommandManager");

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

        this.execute(member, channel, cmd, arg, args);
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