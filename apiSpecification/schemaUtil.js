"use strict";

/*
 * Utility functions related to JSON Schema
 */

var _ = require('underscore');
var ZSchema = require("z-schema");


exports.nullableType = function(type) {
  return [type, 'null'];
};

exports.nullable = function(schemaType) {
  var result = _.clone(schemaType);
  result.type = exports.nullableType(schemaType.type);
  return result;
};

/**
 * Creates a JSON schema object with all fields as required,
 * and the specified docOrder, allowing no additional properties.
 */
exports.schemaObject = function(def) {
  var fieldNames = _.keys(def.properties).sort();
  var documentedNames = _.clone(def.docOrder).sort();
  if(!_.isEqual(fieldNames, documentedNames)) {
    throw new Error("docOrder and list of fields did not correspond. fieldNames: " + JSON.stringify(fieldNames) + " documentedNames " + JSON.stringify(documentedNames));
  }
  var result = {
    type : def.nullable ? exports.nullableType('object') : 'object',
    properties: def.properties,
    required: fieldNames,
    additionalProperties: false,
    docOrder: def.docOrder
  };
  if(def.title) {
    result.title = def.title;
  }
  if(def.description) {
    result.description = def.description;
  }
  return result;
};


exports.compileSchema = function(schema) {
  return new ZSchema().compileSchemasSync([schema])[0];
};