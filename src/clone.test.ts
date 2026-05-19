import clone from './clone';

require('should');

describe('clone function', () => {
	it('should clone primitives', () => {
		clone(42).should.equal(42);
		clone('hello').should.equal('hello');
		clone(true).should.equal(true);
		(clone(null) === null).should.be.true();
		(clone(undefined) === undefined).should.be.true();
	});

	it('should clone arrays deeply', () => {
		const arr: any = [1, 2, { a: 3 }];
		const cloned = clone(arr);
		cloned.should.eql(arr);
		cloned[2].a = 42;
		arr[2].a.should.equal(3);
	});

	it('should clone objects deeply', () => {
		const obj: any = { a: 1, b: { c: 2 } };
		const cloned = clone(obj);
		cloned.should.eql(obj);
		cloned.b.c = 42;
		obj.b.c.should.equal(2);
	});

	it('should handle circular references', () => {
		const obj: any = { name: 'circular' };
		obj.self = obj;
		const cloned = clone(obj);
		cloned.name.should.equal('circular');
		cloned.self.should.equal(cloned);
	});

	it('should clone Date objects', () => {
		const date = new Date();
		const cloned = clone(date);
		cloned.should.be.instanceof(Date);
		cloned.getTime().should.equal(date.getTime());
	});

	it('should clone RegExp objects', () => {
		const regex = /test/gi;
		const cloned = clone(regex);
		cloned.should.be.instanceof(RegExp);
		cloned.source.should.equal(regex.source);
		cloned.flags.should.equal(regex.flags);
	});

	it('should clone Map objects', () => {
		const map = new Map<string, number>([['a', 1]]);
		const cloned = clone(map);
		cloned.should.be.instanceof(Map);
		cloned.get('a')!.should.equal(1);
		cloned.set('b', 2);
		map.has('b').should.be.false();
	});

	it('should clone Set objects', () => {
		const set = new Set([1, 2, 3]);
		const cloned = clone(set);
		cloned.should.be.instanceof(Set);
		cloned.has(2).should.be.true();
		cloned.add(4);
		set.has(4).should.be.false();
	});

	it('should return functions by reference (not cloneable)', () => {
		const fn = () => 'hello';
		const cloned = clone(fn);
		cloned.should.equal(fn);
	});

	it('should return Promises by reference (not cloneable)', () => {
		const p = Promise.resolve(1);
		clone(p).should.equal(p);
	});
});
