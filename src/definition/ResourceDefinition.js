(function() {
    'use strict';


    const type = require('ee-types');
    const PropertyDefinition = require('./PropertyDefinition');
    const RelationDefinition = require('./RelationDefinition');






    module.exports = class ResourceDefinition {



        // resource name
        get name() { return this._name; }


        // resource internal name
        get internalName() { return this._internalName || this._name; }







        /**
         * set up the resource definition
         *
         * @param {string} name the name of the resource
         * @param {string} internalName the internal nam eof the resource
         */
        constructor(name, internalName) {

            // the name of this relation
            if (!type.string(name)) throw new Error(`The name has to be a string. '${type(name)}' given!`);
            if (!name.length) throw new Error(`The name cannot be an empty string!`);
            this._name = name;

            // th einternal name is optional
            if (type.string(internalName)) {
                if (!internalName.length) throw new Error(`The internalName cannot be an empty string!`);
                this._internalName = internalName;
            }



            // the controllers properties
            this.properties = new Map();


            // relations storage
            this.relations = new Map();
        }








        /**
         * checks if a given property exists
         *
         * @param {string} propertyName
         *
         * @returns {boolean}
         */
        hasProperty(propertyName) {
            return this.properties.has(propertyName);
        }






        /**
         * returns given property
         *
         * @param {string} propertyName
         *
         * @returns {propertyDefinition}
         */
        getProperty(propertyName) {
            this.properties.get(propertyName);
        }








        /**
         * checks if a given relation exists
         *
         * @param {string} relationName
         *
         * @returns {boolean}
         */
        hasRelation(relationName) {
            return this.relations.has(relationName);
        }






        /**
         * returns given relation
         *
         * @param {string} relationName
         *
         * @returns {relationDefinition}
         */
        getRelation(relationName) {
            this.relations.get(relationName);
        }








        /**
         * add a new property
         *
         * @param {PropertyDefinition} propertyDefinition the properites definition
         *
         * @returns {object} this
         */
        addProperty(propertyDefinition) {
            if (!(propertyDefinition instanceof PropertyDefinition)) throw new Error(`Cannot add property definition which is not an instance of the PropertyDefinition class!`);
            if (this.hasProperty(propertyDefinition.name)) throw new Error(`Canot add property with the name '${propertyDefinition.name}'. A property with that name exists already!`);
            this.properties.set(propertyDefinition.name, propertyDefinition);
            return this;
        }






        /**
         * add a new relation
         *
         * @param {RelationDefinition} relationDefinition the relations definition
         *
         * @returns {object} this
         */
         addRelation(relationDefinition) {
            if (!(relationDefinition instanceof RelationDefinition)) throw new Error(`Cannot add relation definition which is not an instance of the RelationDefinition class!`);
            if (this.hasProperty(relationDefinition.name)) throw new Error(`Canot add relation with the name '${relationDefinition.name}'. A relation with that name exists already!`);
            this.relations.set(relationDefinition.name, relationDefinition);
            return this;
        }
    };
})();
