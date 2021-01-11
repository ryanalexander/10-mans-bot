
const app = require("../../app");
module.exports = class {

    /**
     *
     * @param {GuildMember} member Discord.JS Member object
     */
    constructor(member) {
        this.member = member;
    }

    /**
     * Get nickname of Member
     * @returns {string} Nickname
     */
    getNickname() {
        return this.member.nickname;
    }

    /**
     * Get Username of Member
     * @returns {string} Member username
     */
    getUsername() {
        return this.member.user.username;
    }

    /**
     * Get Unique id of member
     * @returns {Snowflake} Numberical id of member
     */
    getSnowflake() {
        return this.member.user.id;
    }

    /**
     * Check if member can has access to a specific command. Checks with Bot features
     * @param permission Permission Name
     * @param {Guild} Discord.JS Guild object
     * @returns {boolean} Do they have access
     */
    hasPermission(permission) {
        if(app.config.administrators.indexOf(this.getSnowflake())>-1)
            return true;
        if(permission.toUpperCase() === "DEV")
            return false;
        return this.member.hasPermission(permission);
    }

    hasRoleByName(roleName) {
        return this.member.roles.cache.find(r => r.name === roleName);
    }

    /**
     * Send a direct message to member
     * @param {String} message Message to be sent
     */
    sendMessage(message) {
        // Send message
        this.member.send(message);
    }
}