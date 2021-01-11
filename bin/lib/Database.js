const cassandra = require('cassandra-driver');

const queries = {
    PLAYER_BY_SNOWFLAKE: 'SELECT * FROM players WHERE snowflake = ? LIMIT 1 ALLOW FILTERING;',
    RIOT_BY_PLAYER: 'SELECT * FROM players_riot WHERE player_snowflake = ? LIMIT 1 ALLOW FILTERING;',

}

module.exports = class {

    static #instance;

    constructor() {
        this.client = new cassandra.Client({
            contactPoints: ['108.61.168.90'],
            localDataCenter: 'datacenter1',
            keyspace: '10mans',
            credentials: { username: 'w.ryan', password: 'Garcia#02' }
        });
    }

    /**
     * Fetch Workplace from Database from Snowflake (id)
     * @param {Number} id Workplace snowflake
     * @returns {Promise<types.Row>} Workplace row
     */
    async getWorkplaceBySnowflake(id) {
        return ((await this.client.execute(queries.WORKPLACE_BY_ID, [id], {prepare: true})).first());
    }

    /**
     * Fetch Workplace from Database from Name (enum)
     * @param {String} name Workplace enum name
     * @returns {Promise<types.Row>} Workplace row
     */
    async getWorkplaceByName(name) {
        return ((await this.client.execute(queries.WORKPLACE_BY_NAME, [name], {prepare: true})).first());
    }

    /**
     * Get a list of domains associated with a workplace
     * @param {Number} id Workplace snowflake (id)
     * @returns {Promise<types.Row>} List of domain rows for workplace
     */
    async getDomainByWorkplace(id) {
        return ((await this.client.execute(queries.DOMAINS_BY_WORKPLACE, [id], {prepare: true}))).rows;
    }

    /**
     *
     * @param {String} domain
     * @returns {Promise<types.Row>}
     */
    async getWorkplaceByDomain(domain) {
        return ((await this.client.execute(queries.WORKPLACE_BY_DOMAIN, [domain], {prepare: true})).first());
    }

    async getCertificateByDomain(id) {
        const bundle = (await this.client.execute(queries.BUNDLE_FROM_DOMAIN, [id], {prepare: true})).first();
        if(bundle == null)
            return {ca: null, cert: null, key: null};
        const ca = (await this.client.execute(queries.CERT_AUTHORITY_FROM_SNOWFLAKE, [bundle['ca_snowflake']], {prepare: true})).first();
        return ({
            ca: "-----BEGIN CERTIFICATE-----\n" +ca['certificate'] + "\n-----END CERTIFICATE-----",
            cert: "-----BEGIN CERTIFICATE-----\n" +bundle['certificate'] + "\n-----END CERTIFICATE-----",
            key: "-----BEGIN RSA PRIVATE KEY-----\n" +bundle['private_key'] + "\n-----END RSA PRIVATE KEY-----"
        });
    }
}