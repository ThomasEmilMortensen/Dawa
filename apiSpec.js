"use strict";

var model = require('./awsDataModel');
var _     = require('underscore');


var schema =  {
  uuid: {type: 'string',
    pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'},
  postnr: {type: 'integer',
    minimum: 1000,
    maximum: 9999},
  polygon: {type: 'array',
    items: { type: 'array'}},
  positiveInteger: {
    type: 'integer',
    minimum: 1
  }
};


/**
 * Specificerer hvilke felter en adresse har, samt hvordan de mapper til kolonnenavne i databasen
 * Felterne anvendes som kolonner i CSV-formateringen af adresser.
 */
var adresseFields = [
  {
    name: 'id'
  },
  {
    name: 'vejkode'
  },
  {
    name: 'vejnavn'
  },
  {
    name: 'husnr'
  },
  {
    name: 'supplerendebynavn'
  },
  {
    name: 'postnr'
  },
  {
    name: 'etage'
  },
  {
    name: 'dør',
    column: 'doer'
  },
  {
    name: 'adgangsadresseid'
  },
  {
    name: 'kommune',
    column: 'kommunekode'
  },
  {
    name: 'ejerlav',
    column: 'ejerlavkode'
  },
  {
    name: 'matrikel',
    column: 'matrikelnr'
  }
];
function polygonWhereClause(paramNumberString){
  return "ST_Contains(ST_GeomFromText("+paramNumberString+", 4326)::geometry, wgs84geom)\n";
}

function polygonTransformer(paramValue){
  var mapPoint   = function(point) { return ""+point[0]+" "+point[1]; };
  var mapPoints  = function(points) { return "("+_.map(points, mapPoint).join(", ")+")"; };
  var mapPolygon = function(poly) { return "POLYGON("+_.map(poly, mapPoints).join(" ")+")"; };
  return mapPolygon(paramValue);
}

function d(date) { return JSON.stringify(date); }
//function defaultVal(val, def) { return val ? val : def;}

function mapAddress(rs){
  var adr = {};
  adr.id = rs.enhedsadresseid;
  adr.version = d(rs.e_version);
  if (adr.etage) adr.etage = rs.etage;
  if (adr.dør) adr.dør = rs.doer;
  adr.adressebetegnelse = "TODO";  //TODO
  adr.adgangsadresse = mapAdganggsadresse(rs);
  return adr;
}

function mapAdganggsadresse(rs){
  var slice = function(slice, str) { return ("00000000000"+str).slice(slice); };
  var adr = {};
  adr.id = rs.id;
  adr.version = d(rs.e_version);
  adr.vej = {navn: rs.vejnavn,
    kode: slice(-4, rs.vejkode)};
  adr.husnr = rs.husnr;
  //if (rs.bygningsnavn) adr.bygningsnavn = rs.bygningsnavn;
  if (rs.supplerendebynavn) adr.supplerendebynavn = rs.supplerendebynavn;
  adr.postnummer = {nr: slice(-4, rs.postnr),
    navn: rs.postnrnavn};
  adr.kommune = {kode: slice(-4, rs.kommunekode),
    navn: rs.kommunenavn};
  adr.ejerlav = {kode: slice(-8, rs.ejerlavkode),
    navn: rs.ejerlavnavn};
  adr.matrikelnr = rs.matrikelnr;
  adr.historik = {oprettet: d(rs.e_oprettet),
    'ændret': d(rs.e_aendret)};
  adr.adgangspunkt = {etrs89koordinat: {'øst': rs.oest,
    nord:  rs.nord},
    wgs84koordinat:  {'længde': rs.lat,
      bredde: rs.long},
    kvalitet:        {'nøjagtighed': rs.noejagtighed,
      kilde: rs.kilde,
      tekniskstandard: rs.tekniskstandard},
    tekstretning:    rs.tekstretning,
    'ændret':        d(rs.adressepunktaendringsdato)};
  adr.DDKN = {m100: rs.kn100mdk,
    km1:  rs.kn1kmdk,
    km10: rs.kn10kmdk};

  return adr;
}

var adresseApiSpec = {
  model: model.adresse,
  pageable: true,
  searchable: true,
  fields: adresseFields,
  fieldMap: _.indexBy(adresseFields, 'name'),
  parameters: [
    {
      name: 'id',
      type: 'string',
      schema: schema.uuid
    },
    {
      name: 'vejkode'
    },
    {
      name: 'vejnavn'
    },
    {
      name: 'husnr'
    },
    {
      name: 'supplerendebynavn'
    },
    {
      name: 'postnr',
      type: 'number',
      schema: schema.postnr
    },
    {
      name: 'etage'
    },
    {
      name: 'dør'
    },
    {
      name: 'adgangsadresseid'
    },
    {
      name: 'kommune'
    },
    {
      name: 'ejerlav'
    },
    {
      name: 'matrikel'
    },
    {
      name: 'polygon',
      type: 'array',
      schema: schema.polygon,
      whereClause: polygonWhereClause,
      transform: polygonTransformer
    }
  ],
  mappers: {
    json: mapAddress,
    csv: undefined
  }
};

module.exports = {
  adresse: adresseApiSpec,
  pagingParameterSpec: [
    {
      name: 'side',
      type: 'number',
      schema: schema.positiveInteger
    },
    {
      name: 'per_side',
      type: 'number',
      schema: schema.positiveInteger
    }
  ]


};
