"use strict";

var _ = require('underscore');
var dbapi = require('../dbapi');

exports.query = function(client, datamodel, filter, callback) {
  var sqlParts = {
    select: ['*'],
    from: [datamodel.table],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
  _.each(filter, function(value, key) {
    var alias = dbapi.addSqlParameter(sqlParts, value);
    dbapi.addWhereClause(sqlParts, key + ' = ' + alias);
  });
  dbapi.query(client, sqlParts, callback);
};

exports.create = function(client, datamodel, object, callback) {
  var columns = _.reject(_.keys(object), function(column) {
    return _.isUndefined(column) || _.isNull(column);
  });
  var sql = 'INSERT INTO ' + datamodel.table + '(' + columns.join(', ') + ') VALUES (' +
    _.map(columns, function(column, idx) {
      return '$' + (idx + 1);
    }).join(', ') + ')';
  var params = _.map(columns, function(column) {
    return object[column];
  });
  client.query(sql, params, callback);
};

// note: undefined properties on object are not modified,
// null values are set to null.
exports.update = function(client, datamodel, object, callback) {
  var updatedColumns = _.reject(_.keys(object), function(column) {
    return _.isUndefined(column) || _.contains(datamodel.key, column);
  });
  var sql = 'UPDATE ' + datamodel.table + ' SET ' + _.map(updatedColumns, function(column, idx) {
    return column + ' = $' +(idx+1 );
  }).join(', ') + ' WHERE ' + _.map(datamodel.key, function(column, idx) {
    return column + ' = $' + (1 + updatedColumns.length + idx);
  }).join(' AND ');
  var updateParams = _.map(updatedColumns, function(column) {
    return object[column];
  });
  var keyParams = _.map(datamodel.key, function(column) {
    return object[column];
  });
  var params = updateParams.concat(keyParams);
  client.query(sql, params, callback);
};

exports.delete = function(client, datamodel, key, callback) {
  var sql = 'DELETE FROM ' + datamodel.table + ' WHERE ' + _.map(datamodel.key, function(column, idx) {
    return column + ' = $' + (1 + idx);
  }).join(" AND ");
  var params = _.map(datamodel.key, function(column) {
    return key[column];
  });
  client.query(sql, params, callback);
};