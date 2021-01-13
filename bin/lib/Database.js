const cassandra = require('cassandra-driver');
const Game = require("./Game");

const Player = require("./Player");

const Snowflake = require("./Snowflake");

const queries = {
    PLAYER_BY_SNOWFLAKE: 'SELECT * FROM players WHERE snowflake = ? LIMIT 1 ALLOW FILTERING;',
    PLAYER_BY_DISCORD: 'SELECT * FROM players WHERE discord_id = ? LIMIT 1 ALLOW FILTERING;',
    RIOT_BY_ID: 'SELECT * FROM players_riot WHERE riot_name = ? AND riot_identifier = ? LIMIT 1 ALLOW FILTERING;',
    RIOT_BY_PLAYER: 'SELECT * FROM players_riot WHERE player_snowflake = ? LIMIT 1 ALLOW FILTERING;',

    INSERT: {
        REGISTER_PLAYER: 'INSERT INTO players (snowflake, discord_id, mmr) VALUES (?, ?, ?)',
        REGISTER_GAME: 'INSERT INTO games (snowflake, finished, map, started) values (?, ?, ?, ?);',
        REGISTER_SCORE: 'INSERT INTO game_scores (snowflake, game_id, team_id, team_score) values (?, ?, ?, ?);',
        REGISTER_PLAYER_SCORE: 'INSERT INTO game_players (snowflake, acs, agent, assists, deaths, defuses, first_bloods, game_snowflake, kills, plants, player_snowflake) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        REGISTER_RIOT_ASSOCIATION: 'INSERT INTO players_riot (snowflake, player_snowflake, riot_identifier, riot_name, riot_tagline) values (?, ?, ?, ?, ?);',
    }

}

module.exports = class {

    static #instance;

    constructor() {
        this.client = new cassandra.Client({
            contactPoints: ['108.61.168.90'],
            localDataCenter: 'datacenter1',
            keyspace: '10mans',
            credentials: {username: 'w.ryan', password: 'Garcia#02'}
        });
    }

    async getPlayerBySnowflake(id) {
        return ((await this.client.execute(queries.PLAYER_BY_SNOWFLAKE, [id], {prepare: true})).first());
    }
    async getPlayerByDiscord(id) {
        return ((await this.client.execute(queries.PLAYER_BY_DISCORD, [id], {prepare: true})).first());
    }

    async getPlayerOrCreate(id) {
        var p = await this.getPlayerByDiscord(id);
        if(p === null) {
            var player = new Player((new Snowflake(0)).generateSnowflake('PLAYER'), id, 0);
            this.registerPlayer(player)
            return player;
        }
        return new Player(p['snowflake'], p['discord_id'], p['mmr']);
    }

    async getPlayerByRiotId(riotid, tagline) {
        return await this.getPlayerBySnowflake((await this.client.execute(queries.RIOT_BY_ID, [riotid, tagline], {prepare: true})).first()['player_snowflake']);
    }

    /**
     *
     * @param {Game} game
     * @returns {Promise<void>}
     */
    pushGameData(game) {
        this.client.execute(queries.INSERT.REGISTER_GAME, [
            game.snowflake,
            true,
            game.map,
            game.epoch
        ], {prepare: true}).then(console.log);
    }

    registerPlayer(player) {
        this.client.execute('INSERT INTO players (snowflake, discord_id, mmr) VALUES (?, ?, ?)', [player.getSnowflake(), player.getDiscordId(), player.getMmr()], {prepare: true});
    }
}