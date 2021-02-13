module.exports = class {

    static players = [];

    constructor(snowflake, discord_id, mmr, displayName) {
        this.snowflake = snowflake;
        this.discord_id = discord_id;
        this.mmr = mmr;
        this.displayName = displayName;
    }

    getSnowflake() {
        return this.snowflake;
    }

    getDiscordId() {
        return this.discord_id;
    }

    getMmr() {
        return this.mmr;
    }

    getDisplayName() {
        return this.displayName;
    }

}