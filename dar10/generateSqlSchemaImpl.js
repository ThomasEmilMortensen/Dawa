"use strict";

const _ = require('underscore');

const spec = require('./spec');

const schemas = spec.schemas;
const sqlTypes = spec.sqlTypes;


const standardFields = ['rowkey', 'id', 'eventopret', 'eventopdater', 'status', 'registreringfra', 'registreringtil', 'virkningfra', 'virkningtil'];

const standardColumns = [
  {
    name: 'rowkey',
    type: 'integer',
    nullable: false,
    primaryKey: true
  },
  {
    name: 'id',
    type: 'uuid',
    nullable: false
  },
  {
    name: 'eventopret',
    type: 'integer',
    nullable: true
  },
  {
    name: 'eventopdater',
    type: 'integer',
    nullable: true
  },
  {
    name: 'registrering',
    type: 'tstzrange',
    nullable: false
  },
  {
    name: 'virkning',
    type: 'tstzrange',
    nullable: false
  },
  {
    name: 'status',
    type: 'dar1_status',
    nullable: false
  }
];

function defaultSqlType(jsonSchemaType) {
  if(jsonSchemaType.format === 'date-time') {
    return 'timestamptz';
  }
  if(jsonSchemaType.pattern === "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$") {
    return 'uuid';
  }
  if(jsonSchemaType.type === 'integer' || _.isArray(jsonSchemaType.type) && _.contains(jsonSchemaType.type, 'integer')) {
    return 'integer';
  }
  if(jsonSchemaType.type === 'string' || _.isArray(jsonSchemaType.type) && _.contains(jsonSchemaType.type, 'string')) {
    return 'text';
  }
  throw new Error('Could not get default sql type for ' + JSON.stringify(jsonSchemaType));
}



const entityNames = Object.keys(schemas);
module.exports = () => {
  const ddlStatements = entityNames.map(entityName => {
    const schema = schemas[entityName];
    const properties = schema.properties;
    const columnNames = Object.keys(properties);
    const nonStandardColumnNames = _.difference(columnNames, standardFields);
    const nonStandardColumns = nonStandardColumnNames.map(columnName => {
      const schemaDef = properties[columnName];
      const nullable = _.isArray(schemaDef.type) && _.contains(schemaDef.type, 'null');
      const nonDefaultSqlType = sqlTypes[entityName] && sqlTypes[entityName][columnName];
      const sqlType = nonDefaultSqlType || defaultSqlType(schemaDef);
      return {
        name: columnName,
        type: sqlType,
        nullable: nullable
      };
    });
    const columns = standardColumns.concat(nonStandardColumns);
    const columnSql = columns.map(column => {
      let sql = `${column.name} ${column.type}`;
      if (!column.nullable) {
        sql += ' NOT NULL';
      }
      if (column.primaryKey) {
        sql += ' PRIMARY KEY';
      }
      return sql;
    });
    return `DROP TABLE IF EXISTS dar1_${entityName} CASCADE;\nCREATE TABLE dar1_${entityName}(\n  ${columnSql.join(',\n  ')}\n);`
  });

  return ddlStatements.join('\n\n');
};