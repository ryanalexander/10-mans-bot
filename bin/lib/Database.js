const cassandra = require('cassandra-driver');
const Game = require("./Game");

const app = require("../../app");

const Player = require("./Player");

const Snowflake = require("./Snowflake");

const queries = {
    PLAYER_BY_SNOWFLAKE: 'SELECT * FROM players WHERE snowflake = ? LIMIT 1 ALLOW FILTERING;',
    PLAYER_BY_DISCORD: 'SELECT * FROM players WHERE discord_id = ? LIMIT 1 ALLOW FILTERING;',

    CASTER_BY_SNOWFLAKE: 'SELECT * FROM casters WHERE snowflake = ? LIMIT 1 ALLOW FILTERING;',
    CASTER_BY_PLAYER: 'SELECT * FROM casters WHERE player = ? LIMIT 1 ALLOW FILTERING;',
    CASTER_BY_TWITCH: 'SELECT * FROM casters WHERE twitch = ? LIMIT 1 ALLOW FILTERING;',

    RIOT_BY_ID: 'SELECT * FROM players_riot WHERE riot_name = ? AND riot_identifier = ? LIMIT 1 ALLOW FILTERING;',
    RIOT_BY_PLAYER: 'SELECT * FROM players_riot WHERE player_snowflake = ? ALLOW FILTERING;',

    MATCHES_BY_PLAYER: 'SELECT * FROM game_players WHERE player_snowflake = ? ALLOW FILTERING;',

    PUNISHMENT_BY_PLAYER: 'SELECT * FROM punishments WHERE player = ? ALLOW FILTERING;',
    PUNISHMENT_BY_SNOWFLAKE: 'SELECT * FROM punishments WHERE player = ? ALLOW FILTERING;',

    INSERT: {
        REGISTER_PLAYER: 'INSERT INTO players (snowflake, discord_id, mmr, first_seen) VALUES (?, ?, ?, ?)',
        REGISTER_CASTER: 'INSERT INTO casters (snowflake, player, twitch) VALUES (?, ?, ?)',

        REGISTER_GAME: 'INSERT INTO games (snowflake, finished, map, started) values (?, ?, ?, ?);',
        REGISTER_SCORE: 'INSERT INTO game_scores (snowflake, game_id, team_id, team_score) values (?, ?, ?, ?);',
        REGISTER_PLAYER_SCORE: 'INSERT INTO game_players (snowflake, acs, agent, assists, deaths, defuses, first_bloods, game_snowflake, kills, plants, player_snowflake) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        REGISTER_RIOT_ASSOCIATION: 'INSERT INTO players_riot (snowflake, player_snowflake, riot_identifier, riot_name, riot_tagline) values (?, ?, ?, ?, ?);',

        REGISTER_PUNISHMENT: 'INSERT INTO punishments (snowflake, active, expires, notes, player, reason, staff) VALUES (?, ?, ?, ?, ?, ?, ?);'
    },

    UPDATE: {
        SET_GAME_MAP: 'UPDATE games SET map = ? WHERE snowflake = ?',
        SET_GAME_FINISHED: 'UPDATE games SET finished = ? WHERE snowflake = ?',

        UPDATE_PUNISHMENT_ACTIVE: 'UPDATE punishments SET active = ? WHERE snowflake = ?',
        UPDATE_PUNISHMENT_NOTE: 'UPDATE punishments SET notes = ? WHERE snowflake = ?',
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

    async getPunishments(player) {
        return await this.client.execute(queries.PUNISHMENT_BY_PLAYER, [player.snowflake], {prepare: true});
    }

    async getCasterByPlayer(id) {
        return await this.client.execute(queries.CASTER_BY_PLAYER, [id], {prepare: true});
    }
    async getCasterOrCreate(id, twitch) {
        var p = await this.getCasterByPlayer(id);
        if(p !== null)
            return p;
        return this.registerCaster(id, twitch);
    }

    async blacklistPlayer(player, staff, reason, duration) {
        return await this.client.execute(queries.INSERT.REGISTER_PUNISHMENT, [
            app.snowflake.generateSnowflake('PUNISHMENT'),
            true,
            (new Date().getTime()) + duration,
            '',
            player.snowflake,
            reason,
            staff.snowflake
        ], {prepare: true})
    }

    registerCaster(player, twitch) {
        this.client.execute(queries.INSERT.REGISTER_CASTER, [app.snowflake.generateSnowflake(""), player, twitch])
    }

    registerPlayer(player) {
        this.client.execute(queries.INSERT.REGISTER_PLAYER, [player.getSnowflake(), player.getDiscordId(), player.getMmr(), (new Date().getTime())], {prepare: true});
    }

    setGameMap(game, map) {
        this.client.execute(queries.UPDATE.SET_GAME_MAP, [map, game.snowflake]).then(r => {
            console.log(`Updated map for ${game.snowflake} to ${map}`);
        });
    }

    finishGame(game) {
        this.client.execute(queries.UPDATE.SET_GAME_FINISHED, [new Date().getTime(), game.snowflake]);
    }

    async registerGame(game) {
        const q = [
            {
                query: 'INSERT INTO games (snowflake, finished, map, started) values (?, ?, ?, ?);',
                params: [game.snowflake, 0, game.map, game.epoch]
            }
        ]

        for(var i = 0; i < game.players.length; i++){
            let player_obj = await this.getPlayerOrCreate(game.players[i]);
            q.push({
                query: 'INSERT INTO game_players (snowflake, acs, agent, assists, deaths, defuses, first_bloods, game_snowflake, kills, plants, player_snowflake) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                params: [app.snowflake.generateSnowflake('SCORE_ENTRY'), 0, 'UNKNOWN', 0, 0, 0, 0, game.snowflake, 0, 0, player_obj.snowflake]
            })
        }

        return await this.client.batch(q, {prepare: true});
    }

    /**
     *
     * @param {BigInt} player snowflake
     * @returns {types.ResultSet}
     */
    async getMatchesByPlayer(snowflake) {
        return await this.client.execute(queries.MATCHES_BY_PLAYER, [snowflake], {prepare: true});
    }

    /**
     *
     * @param {Player} player
     * @returns {types.ResultSet}
     */
    async getLinkedAccounts(player) {
        return await this.client.execute(queries.RIOT_BY_PLAYER, [player.snowflake], {prepare: true});
    }
}