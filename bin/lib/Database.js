const cassandra = require('cassandra-driver');
const Game = require("./Game");

const app = require("../../app");

const Player = require("./Player");

const Snowflake = require("./Snowflake");

const queries = {
    EVENT_BY_SNOWFLAKE: 'SELECT * FROM events WHERE snowflake = ? LIMIT 1 ALLOW FILTERING;',
    UPCOMING_EVENTS: 'SELECT * FROM events WHERE time > ? LIMIT 10 ALLOW FILTERING;',

    PLAYER_BY_SNOWFLAKE: 'SELECT * FROM players WHERE snowflake = ? LIMIT 1 ALLOW FILTERING;',
    PLAYER_BY_DISCORD: 'SELECT * FROM players WHERE discord_id = ? LIMIT 1 ALLOW FILTERING;',

    CASTER_BY_SNOWFLAKE: 'SELECT * FROM casters WHERE snowflake = ? LIMIT 1 ALLOW FILTERING;',
    CASTER_BY_PLAYER: 'SELECT * FROM casters WHERE player = ? LIMIT 1 ALLOW FILTERING;',
    CASTER_BY_TWITCH: 'SELECT * FROM casters WHERE twitch = ? LIMIT 1 ALLOW FILTERING;',

    STAFF_BY_SNOWFLAKE: 'SELECT * FROM staff WHERE snowflake = ? LIMIT 1 ALLOW FILTERING;',
    STAFF_BY_PLAYER: 'SELECT * FROM staff WHERE player_snowflake = ? LIMIT 1 ALLOW FILTERING;',

    RIOT_BY_ID: 'SELECT * FROM players_riot WHERE riot_name = ? AND riot_identifier = ? LIMIT 1 ALLOW FILTERING;',
    RIOT_BY_PLAYER: 'SELECT * FROM players_riot WHERE player_snowflake = ? ALLOW FILTERING;',

    MATCHES_BY_PLAYER: 'SELECT * FROM game_players WHERE player_snowflake = ? ALLOW FILTERING;',

    PUNISHMENT_BY_PLAYER: 'SELECT * FROM punishments WHERE player = ? ALLOW FILTERING;',
    PUNISHMENT_BY_SNOWFLAKE: 'SELECT * FROM punishments WHERE player = ? ALLOW FILTERING;',
    EXPIRED_ACTIVE_PUNISHMENTS: 'SELECT * FROM punishments WHERE active = true AND expires < ? ALLOW FILTERING;',

    INSERT: {
        REGISTER_EVENT: 'INSERT INTO events (snowflake, cancelled, time, title) VALUES (?, ?, ?, ?)',

        ADD_GAME_CASTER: 'INSERT INTO game_casters (snowflake, caster, game) VALUES (?, ?, ?)',
        ADD_EVENT_CASTER: 'INSERT INTO event_casters (snowflake, add_reason, caster_id, event_id) VALUES (?, ?, ?, ?)',

        REGISTER_PLAYER: 'INSERT INTO players (snowflake, discord_id, "displayName", mmr, first_seen) VALUES (?, ?, ?, ?, ?)',
        REGISTER_CASTER: 'INSERT INTO casters (snowflake, player, twitch) VALUES (?, ?, ?)',

        REGISTER_GAME: 'INSERT INTO games (snowflake, finished, map, started) values (?, ?, ?, ?);',
        REGISTER_PLAYER_SCORE: 'INSERT INTO game_players (snowflake, acs, agent, assists, deaths, defuses, first_bloods, game_snowflake, kills, plants, player_snowflake, team) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        REGISTER_RIOT_ASSOCIATION: 'INSERT INTO players_riot (snowflake, player_snowflake, riot_identifier, riot_name, riot_tagline) values (?, ?, ?, ?, ?);',
        REGISTER_TEAM: 'INSERT INTO game_teams (snowflake, game_id, team_id, team_name, team_score) VALUES (?,?,?,?,?)',

        REGISTER_PUNISHMENT: 'INSERT INTO punishments (snowflake, active, expires, notes, player, reason, staff) VALUES (?, ?, ?, ?, ?, ?, ?);'
    },

    UPDATE: {
        SET_GAME_MAP: 'UPDATE games SET map = ? WHERE snowflake = ?',
        SET_GAME_FINISHED: 'UPDATE games SET finished = ? WHERE snowflake = ?',

        UPDATE_TEAM_NAME: 'UPDATE game_teams SET team_name = ? WHERE snowflake = ?',

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

    async getUpcomingEvents() {
        return ((await this.client.execute(queries.UPCOMING_EVENTS, [new Date().getTime()], {prepare: true})));
    }

    async getEventBySnowflake(id) {
        return ((await this.client.execute(queries.EVENT_BY_SNOWFLAKE, [id], {prepare: true})));
    }

    async getPlayerBySnowflake(id) {
        return ((await this.client.execute(queries.PLAYER_BY_SNOWFLAKE, [id], {prepare: true})).first());
    }
    async getPlayerByDiscord(id) {
        return ((await this.client.execute(queries.PLAYER_BY_DISCORD, [id], {prepare: true})).first());
    }

    async getPlayerOrCreate(id) {
        var p = await this.getPlayerByDiscord(id);
        var discord = await app.discordClient.users.fetch(id);
        if(p === null) {
            var player = new Player((new Snowflake(0)).generateSnowflake('PLAYER'), id, 0, discord.username);
            this.registerPlayer(player)
            return player;
        }
        app.discordClient.users.fetch(id).then(user => {
            app.database.client.execute(`UPDATE players SET "displayName" = ? WHERE snowflake = ?`, [user.username, p['snowflake']]);
        });
        return new Player(p['snowflake'], p['discord_id'], p['mmr']);
    }

    async getPlayerByRiotId(riotid, tagline) {
        return await this.getPlayerBySnowflake((await this.client.execute(queries.RIOT_BY_ID, [riotid, tagline], {prepare: true})).first()['player_snowflake']);
    }

    async getPlayerFirstGame(snowflake) {
        return await this.client.execute(`SELECT * FROM game_players WHERE player_snowflake = '${snowflake} LIMIT 1;'`)
    }

    async getPunishments(player) {
        return await this.client.execute(queries.PUNISHMENT_BY_PLAYER, [player.snowflake], {prepare: true});
    }

    async getCasterByPlayer(id) {
        return await this.client.execute(queries.CASTER_BY_PLAYER, [id], {prepare: true});
    }
    async getCasterOrCreate(id, twitch) {
        var p = await this.getCasterByPlayer(id);
        if(p !== null && p.rows[0] !== undefined)
            return p.rows[0];
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

    registerEventCaster(caster, event, reason) {
        this.client.execute(queries.INSERT.ADD_EVENT_CASTER, [app.snowflake.generateSnowflake(""), reason, caster, event])
    }

    registerEvent(title, time) {
        this.client.execute(queries.INSERT.REGISTER_EVENT, [app.snowflake.generateSnowflake(""), "false", time, title])
    }

    registerCaster(player, twitch) {
        this.client.execute(queries.INSERT.REGISTER_CASTER, [app.snowflake.generateSnowflake(""), player, twitch], {prepare: true})
    }

    registerPlayer(player) {
        this.client.execute(queries.INSERT.REGISTER_PLAYER, [player.getSnowflake(), player.getDiscordId(), player.getDisplayName(), player.getMmr(), (new Date().getTime())], {prepare: true});
    }

    associateRiot(player, tag) {
        this.client.execute(queries.INSERT.REGISTER_RIOT_ASSOCIATION, [app.snowflake.generateSnowflake(""), player, "", tag[0], tag[1]])
    }

    setGameMap(game, map) {
        this.client.execute(queries.UPDATE.SET_GAME_MAP, [map, game.snowflake], {prepare: true}).then(r => {
            console.log(`Updated map for ${game.snowflake} to ${map}`);
        });
    }

    setTeamName(snowflake, name) {
        this.client.execute(queries.UPDATE.UPDATE_TEAM_NAME, [name, snowflake], {prepare: true});
    }

    addCasterToGame(game, caster) {
        this.client.execute(queries.INSERT.ADD_GAME_CASTER, [app.snowflake.generateSnowflake(), caster, game], {prepare: true});
    }

    finishGame(game) {
        this.client.execute(queries.UPDATE.SET_GAME_FINISHED, [new Date().getTime(), game.snowflake], {prepare: true});
    }

    async registerGame(game) {
        const q = [
            {
                query: 'INSERT INTO games (snowflake, finished, map, started) values (?, ?, ?, ?);',
                params: [game.snowflake, 0, game.map, game.epoch]
            }
        ]
        let results = [];

        for(var i = 0; i < game.teams.length; i++) {
            var sf = app.snowflake.generateSnowflake();
            await this.client.execute(queries.INSERT.REGISTER_TEAM, [sf, game.snowflake, i, game.teams[i].name, 0], {prepare: true})
            results['team' + i] = sf;
        }

        for(var i = 0; i < game.players.length; i++){
            let player_obj = await this.getPlayerOrCreate(game.players[i]);
            let firstGame = await this.getPlayerFirstGame(player_obj.snowflake);
            q.push({
                query: 'INSERT INTO game_players (snowflake, acs, agent, assists, deaths, defuses, first_bloods, first_game, game_snowflake, kills, plants, player_snowflake, team) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                params: [app.snowflake.generateSnowflake('SCORE_ENTRY'), 0, 'UNKNOWN', 0, 0, 0, 0, (firstGame === null || firstGame === undefined), game.snowflake, 0, 0, player_obj.snowflake, -1]
            })
        }
        await this.client.batch(q, {prepare: true});

        return results;
    }

    /**
     *
     * @param {BigInt} player snowflake
     * @returns {types.ResultSet}
     */
    async getMatchesByPlayer(snowflake) {
        return await this.client.execute(queries.MATCHES_BY_PLAYER, [snowflake], {prepare: true});
    }

    async getStaffByPlayer(id) {
        return await this.client.execute(queries.STAFF_BY_PLAYER, [id], {prepare: true});
    }

    /**
     *
     * @param {Player} player
     * @returns {types.ResultSet}
     */
    async getLinkedAccounts(player) {
        return await this.client.execute(queries.RIOT_BY_PLAYER, [player.snowflake], {prepare: true});
    }

    createApiKey(snowflake, uuid) {
        this.client.execute('INSERT INTO api_keys (snowflake, key, owner) VALUES (?, ?, ?)', [app.snowflake.generateSnowflake(), uuid, snowflake], {prepare: true});
    }
}