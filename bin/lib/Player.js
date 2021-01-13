module.exports = class {

    static players = [];

    constructor(snowflake, discord_id, mmr) {
        this.snowflake = snowflake;
        this.discord_id = discord_id;
        this.mmr = mmr;
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

}