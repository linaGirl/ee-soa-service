(function() {
    'use strict';


    const type = require('ee-types');





    // the relation types supported
    const relationTypes = new Set();

    relationTypes.add('hasOne');
    relationTypes.add('hasMany');
    relationTypes.add('belongsTo');







    module.exports = class RelationDefinition {



        // relation type. read-only
        get type() { return this._type; }

        // relation name. read-only
        get name() { return this._name; }




        // relations local key
        get localKey() { return this._localKey; }

        // relations remote key
        get remoteKey() { return this._remoteKey; }




        // via resource
        get viaResource() {
            if (this.type === 'belongsTo') return this._viaResource;
            else throw new Error(`Cannot return the via resource for a relation of the type ${this.type}!`);
        }

        // via loocal key
        get viaLocalKey() {
            if (this.type === 'belongsTo') return this._viaLocalKey;
            else throw new Error(`Cannot return the via local key for a relation of the type ${this.type}!`);
        }

        // via remote key
        get viaRemoteKey() {
            if (this.type === 'belongsTo') return this._viaRemoteKey;
            else throw new Error(`Cannot return the via remote key for a relation of the type ${this.type}!`);
        }






        /**
         * sets up the relation definition
         *
         * @param {string} relationType the type of the relation
         * @param {string} relationName the name of the relation
         */
        constructor(relationType, relationName) {

            // the name of this relation
            if (!type.string(relationName)) throw new Error(`The relationName has to be a string. '${type(relationName)}' given!`);
            if (!relationName.length) throw new Error(`The relationName cannot be an empty string!`);
            this._name = relationName;


            // the type of the relation
            if (!relationTypes.has(relationType)) throw new Error(`The relation type ${relationType} is not valid. Valid types are ${Array.from(relationTypes).join(', ')}`);
            this._type = relationType;
        }







        /**
         * set the local key name
         *
         * @param {string} localKeyName the name of the local key
         *
         * @returns {object} this instance
         */
        setLocalKey(localKeyName) {
            if (!type.string(localKeyName)) throw new Error(`The localKey has to be a string. '${type(localKeyName)}' given!`);
            if (!localKeyName.length) throw new Error(`The localKey cannot be an empty string!`);
            if (type.string(this.localKey)) throw new Error(`Cannot redefine the localKey property '${this.localKey}' using the value '${localKeyName}'!`);
            this._localKey = localKeyName;
            return this;
        }







        /**
         * set the remote key name
         *
         * @param {string} remoteKeyName the name of the remote key
         *
         * @returns {object} this instance
         */
        setRemoteKey(remoteKeyName) {
            if (!type.string(remoteKeyName)) throw new Error(`The localKey has to be a string. '${type(remoteKeyName)}' given!`);
            if (!remoteKeyName.length) throw new Error(`The localKey cannot be an empty string!`);
            if (type.string(this.remoteKey)) throw new Error(`Cannot redefine the localKey property '${this.remoteKey}' using the value '${remoteKeyName}'!`);
            this._remoteKey = remoteKeyName;
            return this;
        }







        /**
         * set the via resource name
         *
         * @param {string} viaResource the name of the via resource
         *
         * @returns {object} this instance
         */
        setViaReesource(viaResource) {
            if (this.type !== 'belongsTo') throw new Error(`Cannot set the via resource for a relation of the type ${this.type}!`);
            if (!type.string(viaResource)) throw new Error(`The viaResource has to be a string. '${type(viaResource)}' given!`);
            if (!viaResource.length) throw new Error(`The viaResource cannot be an empty string!`);
            if (type.string(this.viaResource)) throw new Error(`Cannot redefine the viaResource property '${this.remoteKey}' using the value '${viaResource}'!`);
            this._viaResource = viaResource;
            return this;
        }







        /**
         * set the via local key name
         *
         * @param {string} viaLocalKey the name of the via local key
         *
         * @returns {object} this instance
         */
        setViaEntity(viaLocalKey) {
            if (this.type !== 'belongsTo') throw new Error(`Cannot set the via local key for a relation of the type ${this.type}!`);
            if (!type.string(viaLocalKey)) throw new Error(`The viaLocalKey has to be a string. '${type(viaLocalKey)}' given!`);
            if (!viaLocalKey.length) throw new Error(`The viaLocalKey cannot be an empty string!`);
            if (type.string(this.viaLocalKey)) throw new Error(`Cannot redefine the viaLocalKey property '${this.viaLocalKey}' using the value '${viaLocalKey}'!`);
            this._viaLocalKey = viaLocalKey;
            return this;
        }







        /**
         * set the via remote key name
         *
         * @param {string} viaRemoteKey the name of the via remote key
         *
         * @returns {object} this instance
         */
        setViaEntity(viaRemoteKey) {
            if (this.type !== 'belongsTo') throw new Error(`Cannot set the via local key for a relation of the type ${this.type}!`);
            if (!type.string(viaRemoteKey)) throw new Error(`The viaRemoteKey has to be a string. '${type(viaRemoteKey)}' given!`);
            if (!viaRemoteKey.length) throw new Error(`The viaRemoteKey cannot be an empty string!`);
            if (type.string(this.viaRemoteKey)) throw new Error(`Cannot redefine the viaRemoteKey property '${this.viaRemoteKey}' using the value '${viaRemoteKey}'!`);
            this._viaRemoteKey = viaRemoteKey;
            return this;
        }
    };





    // export the types
    for (const typeName of relationTypes) module.exports.prototype[typeName] = typeName;
})();
