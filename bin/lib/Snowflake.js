const process = require("process");
const app = require("../../app");
const types = ['','GAME', 'SCORE_ENTRY', 'GAME_PLAYER', 'PLAYER', 'RIOT_PLAYER'];
let epoch = new Date().getTime();

module.exports = class {
    constructor(instanceId) {

        // TODO Implement instance id calc
        // [TYPE] [INSTANCE ID] [SERVER EPOCH] [IDENTIFIER] [PROCESS ID] [RANDOM < 1024]

        this.identifier = 0;
        this.instanceId = instanceId;
    }

    /**
     *
     * @returns {string}
     * @param {types} type
     */
    generateSnowflake(type) {
        this.identifier++;
        if(this.identifier >= 9216) this.identifier = 0;
        return types.indexOf(type) + "" + this.instanceId + "" + Math.floor(Math.random() * Math.floor(1024)) + "" + new Date(new Date().getTime() - epoch).getTime() + "" + this.identifier + process.pid + Math.floor(Math.random() * Math.floor(1024));
    }
}
