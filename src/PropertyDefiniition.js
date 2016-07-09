(function() {
    'use strict';


    const type = require('ee-types');





    // the relation types supported
    const propertyTypes = new Set();

    propertyTypes.add('string');
    propertyTypes.add('boolean');
    propertyTypes.add('number');
    propertyTypes.add('date');
    propertyTypes.add('json');








    module.exports = class PropertyDefinition {



        // property type
        get type() { return this._type; }

        // property name
        get name() { return this._name; }

        // required
        get required() { return this._required; }




        // property internal type
        get internalType() { return this._internalType || this.type; }

        // property internal name
        get internalName() { return this._internalName || this.name; }





        /**
         * sets up the property definition
         *
         * @param {string} propertyType the type of the property
         * @param {string} propertyName the name of the property
         */
        constructor(propertyType, propertyName) {

            // the name of this property
            if (!type.string(propertyName)) throw new Error(`The propertyName has to be a string. '${type(propertyName)}' given!`);
            if (!propertyName.length) throw new Error(`The propertyName cannot be an empty string!`);
            this._name = propertyName;


            // the type of the property
            if (!propertyTypes.has(propertyType)) throw new Error(`The property type ${propertyType} is not valid. Valid types are ${Array.from(propertyTypes).join(', ')}`);
            this._type = propertyType;
        }







        /**
         * set required flag
         *
         * @param {boolean} required required flag
         *
         * @returns {object} this instance
         */
        setRequired(required) {
            if (!type.boolean(required)) throw new Error(`The required flag has to be a boolean. '${type(required)}' given!`);
            if (type.boolean(this._required)) throw new Error(`Cannot redefine the required property '${this.required}' using the value '${required}'!`);
            this._required = required;
            return this;
        }







        /**
         * set the internal name
         *
         * @param {string} internalName the internal name
         *
         * @returns {object} this instance
         */
        setInternalName(internalName) {
            if (!type.string(internalName)) throw new Error(`The internalName has to be a string. '${type(internalName)}' given!`);
            if (!internalName.length) throw new Error(`The internalName cannot be an empty string!`);
            if (type.string(this.internalName)) throw new Error(`Cannot redefine the internalName property '${this.internalName}' using the value '${internalName}'!`);
            this._internalName = internalName;
            return this;
        }







        /**
         * set the internal type
         *
         * @param {string} internalType the internal type
         *
         * @returns {object} this instance
         */
        setInternalType(internalType) {
            if (!type.string(internalType)) throw new Error(`The internalType has to be a string. '${type(internalType)}' given!`);
            if (!internalType.length) throw new Error(`The internalType cannot be an empty string!`);
            if (type.string(this.internalType)) throw new Error(`Cannot redefine the internalType property '${this.internalType}' using the value '${internalType}'!`);
            this._internalType = internalType;
            return this;
        }
    };





    // export the types
    for (const typeName of propertyTypes) module.exports.prototype[typeName] = typeName;
})();
