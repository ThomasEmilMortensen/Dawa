"use strict";

var parameterParsing = require("../../parameterParsing");

var schema =  {
  uuid: {type: 'string',
         pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'},
};

var parameterSpec =  {
  anyValue:  {name: 'something'},
  aString:   {type: 'string'},
  aNumber:   {type: 'number'},
  anArray:   {type: 'array'},
  anObject:  {type: 'object'},
  anotherNumber: {type: 'number'},
  uuid: {type: 'string',
         schema: schema.uuid},
};

describe("Parsing types with schemas", function () {
  it("should succeed on valid data", function (done) {
    expect(parameterParsing.parseParameters({uuid: '"98239823-9823-9823-9823-982398239823"'}, parameterSpec))
      .toEqual({params: {uuid: "98239823-9823-9823-9823-982398239823"}, errors: []});
    done();
  });

  it("should fail on invalid data ", function (done) {
    expect(parameterParsing.parseParameters({uuid: '"98239823-982-982-982-982398239823"'}, parameterSpec))
      .toEqual({params: {}, errors: [['uuid', 'String does not match pattern: ^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$']]});
    done();
  });
});

describe("Parsing parameters of type 'string'", function () {
  it("should accept strings", function (done) {
    expect(parameterParsing.parseParameters({aString: '"str"'}, parameterSpec))
      .toEqual({params: {aString: "str"}, errors: []});
    done();
  });

  it("should fails on other data than strings", function (done) {
    expect(parameterParsing.parseParameters({aString: '42'}, parameterSpec))
      .toEqual({params: {}, errors: [['aString', 'notString']]});
    expect(parameterParsing.parseParameters({aString: '[1,2,3]'}, parameterSpec))
      .toEqual({params: {}, errors: [['aString', 'notString']]});

    done();
  });
});

describe("Parsing parameters of different types", function () {
  it("should succeed", function (done) {
    expect(parameterParsing.parseParameters({aString:'"str"', aNumber:"42", anotherNumber:"3.14", anArray:'[1,2,"3"]', anObject:'{"foo":42}'}, parameterSpec))
      .toEqual({params: {aString: "str", aNumber: 42, anotherNumber: 3.14, anArray: [1,2,"3"], anObject: {foo:42}}, errors: []});
    done();
  });
});

describe("When Parsing parameters", function () {
  it("all errors should be returned", function (done) {
    expect(parameterParsing.parseParameters({aString: "42", aNumber: "ad", anotherNumber: "[3.14]", anArray: "42", anObject: "42"}, parameterSpec))
      .toEqual({params: {}, errors: [["aString", 'notString'],["aNumber", 'notNumber'],
                                     ["anotherNumber", 'notNumber'], ["anArray", 'notArray'], ["anObject", 'notObject']]});
    done();
  });
});

describe("When Parsing object", function () {
  it("arrays should not be accepted", function (done) {
    expect(parameterParsing.parseParameters({anObject: "[1,2,3]"}, parameterSpec))
      .toEqual({params: {}, errors: [['anObject', 'notObject']]});
    done();
  });
});

describe("Parsing parameters of type 'undefined'", function () {
  it("should never fail", function (done) {
    expect(parameterParsing.parseParameters({anyValue: "aString"}, parameterSpec))
      .toEqual({params: {anyValue: "aString"}, errors: []});

    expect(parameterParsing.parseParameters({anyValue: "42"}, parameterSpec))
      .toEqual({params: {anyValue: "42"}, errors: []});

    expect(parameterParsing.parseParameters({anyValue: "3.14"}, parameterSpec))
      .toEqual({params: {anyValue: "3.14"}, errors: []});

    expect(parameterParsing.parseParameters({anyValue: "[[[1,2,3]]]"}, parameterSpec))
      .toEqual({params: {anyValue: "[[[1,2,3]]]"}, errors: []});

    done();
  });
});

describe("When parsing unkonwn parameters'", function () {
  it("they should just be ignored", function (done) {
    expect(parameterParsing.parseParameters({anyValue: "42", unknownParam: ""}, parameterSpec))
      .toEqual({params: {anyValue: "42"}, errors: []});

    expect(parameterParsing.parseParameters({unknownParam: ""}, parameterSpec))
      .toEqual({params: {}, errors: []});

    done();
  });
});