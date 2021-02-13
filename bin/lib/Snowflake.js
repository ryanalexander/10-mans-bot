const process = require("process");
const { UniqueID } = require('nodejs-snowflake');
const app = require("../../app");
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
    generateSnowflake() {
        this.identifier++;
        if(this.identifier >= 9216) this.identifier = 0;
        return new UniqueID({
            returnNumber: false,
            machineID: 0,
            customEpoch: epoch,

        }).getUniqueID();
    }
}
