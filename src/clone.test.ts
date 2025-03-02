import clone from './clone';

require('should');

describe('clone function', function () {
  it('should clone primitives', function () {
    clone(42).should.equal(42);
    clone("hello").should.equal("hello");
    clone(true).should.equal(true);
    (clone(null) === null).should.be.true();
    (clone(undefined) === undefined).should.be.true();
  });

  it('should clone arrays deeply', function () {
    const arr = [1, 2, { a: 3 }];
    const cloned = clone(arr);
    cloned.should.eql(arr);
    // Modify the nested object in the cloned array
    cloned[2].a = 42;
    arr[2].a.should.equal(3);
  });

  it('should clone objects deeply', function () {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = clone(obj);
    cloned.should.eql(obj);
    cloned.b.c = 42;
    obj.b.c.should.equal(2);
  });

  it('should handle circular references', function () {
    const obj = { name: 'circular' };
    obj.self = obj;
    const cloned = clone(obj);
    cloned.should.eql(obj);
    // The circular reference in the clone should point to itself.
    cloned.self.should.equal(cloned);
  });

  it('should clone Date objects', function () {
    const date = new Date();
    const cloned = clone(date);
    cloned.should.be.instanceof(Date);
    cloned.getTime().should.equal(date.getTime());
  });

  it('should clone RegExp objects', function () {
    const regex = /test/gi;
    const cloned = clone(regex);
    cloned.should.be.instanceof(RegExp);
    cloned.source.should.equal(regex.source);
    cloned.flags.should.equal(regex.flags);
    // Changing lastIndex of the clone should not affect the original.
    cloned.lastIndex = 5;
    regex.lastIndex.should.not.equal(5);
  });

  it('should clone Map objects', function () {
    const map = new Map([['a', 1]]);
    const cloned = clone(map);
    cloned.should.be.instanceof(Map);
    cloned.get('a').should.equal(1);
    // Modify cloned map and verify the original is not affected.
    cloned.set('b', 2);
    map.has('b').should.be.false();
  });

  it('should clone Set objects', function () {
    const set = new Set([1, 2, 3]);
    const cloned = clone(set);
    cloned.should.be.instanceof(Set);
    cloned.has(2).should.be.true();
    // Add an element to the cloned set and verify the original remains unchanged.
    cloned.add(4);
    set.has(4).should.be.false();
  });

  it('should clone functions by reference', function () {
    const fn = () => "hello";
    const cloned = clone(fn);
    // Functions are not cloned; they are returned by reference.
    cloned.should.equal(fn);
  });

  it('should clone non-enumerable properties when includeNonEnumerable is true', function () {
    const obj = { a: 1 };
    Object.defineProperty(obj, 'hidden', {
      value: 42,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    const cloned = clone(obj, { includeNonEnumerable: true });
    // The clone should have the non-enumerable property.
    cloned.hidden.should.equal(42);
    const descriptor = Object.getOwnPropertyDescriptor(cloned, 'hidden');
    should.exist(descriptor);
    descriptor.enumerable.should.equal(false);
  });

  it('should not clone non-enumerable properties when includeNonEnumerable is false', function () {
    const obj = { a: 1 };
    Object.defineProperty(obj, 'hidden', {
      value: 42,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    const cloned = clone(obj, { includeNonEnumerable: false });
    // The non-enumerable property should not be copied.
    (cloned.hidden === undefined).should.be.true();
  });

  it('clone.clonePrototype should create a shallow clone using the prototype', function () {
    const proto = { hello: "world" };
    const obj = Object.create(proto);
    obj.a = 1;
    const cloned = clone.clonePrototype(obj);
    cloned.should.not.equal(obj);
    // The prototype of the cloned object should be the original object.
    Object.getPrototypeOf(cloned).should.equal(obj);
  });
});
