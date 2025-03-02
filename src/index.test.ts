import fs from 'fs';
import should from "should";
import clone from "lodash/clone";
import nodeCache from "./index";
import { randomNumber, randomString, diffKeys } from "./helpers";

const { stringify } = JSON;
const pkg = JSON.parse(fs.readFileSync("package.json", 'utf-8'));
const localCache = new nodeCache({ stdTTL: 0 });
const localCacheNoClone = new nodeCache({ stdTTL: 0, useClones: false, checkperiod: 0 });
const localCacheMaxKeys = new nodeCache({ maxKeys: 2 });
const localCacheTTL = new nodeCache({ stdTTL: 0.3, checkperiod: 0 });
const localCacheNoDelete = new nodeCache({ stdTTL: 0.3, checkperiod: 0, deleteOnExpire: false });
const localCacheMset = new nodeCache({ stdTTL: 0 });
const indexOf = [].indexOf;
let BENCH = {};

localCache._killCheckPeriod();
let state = {};

describe(`\`${pkg.name}@${pkg.version}\` on \`node@${process.version}\``, function () {
  after(function () {
    let txt = `Benchmark node@${process.version}:`;
    for (const type in BENCH) {
      const ops = BENCH[type];
      txt += `\n   - ${type}: ${ops.toFixed(1)} ops/s`;
    }
    console.log(txt);
  });

  describe("general sync-style", function () {
    before(function () {
      localCache.flushAll();
      state = {
        start: clone(localCache.getStats()),
        value: randomString(100),
        value2: randomString(100),
        value3: randomString(100),
        key: randomString(10),
        obj: {
          a: 1,
          b: { x: 2, y: 3 }
        },
        otp: randomString(10)
      };
    });

    it("set key", function () {
      const res = localCache.set(state.key, state.value, 0);
      true.should.eql(res);
      (1).should.eql(localCache.getStats().keys - state.start.keys);
    });

    it("get key", function () {
      const res = localCache.get(state.key);
      state.value.should.eql(res);
    });

    it("get key names", function () {
      const res = localCache.keys();
      [state.key].should.eql(res);
    });

    it("has key", function () {
      const res = localCache.has(state.key);
      res.should.eql(true);
    });

    it("does not have key", function () {
      const res = localCache.has("non existing key");
      res.should.eql(false);
    });

    it("delete an undefined key", function () {
      const count = localCache.del("xxx");
      (0).should.eql(count);
    });

    it("take key", function () {
      let res = localCache.has("otp");
      res.should.eql(false);
      res = localCache.take("otp");
      should.not.exist(res);
      res = localCache.set("otp", state.otp, 0);
      true.should.eql(res);
      res = localCache.has("otp");
      res.should.eql(true);
      res = localCache.has("otp");
      res.should.eql(true);
      const otp = localCache.take("otp");
      otp.should.eql(state.otp);
      res = localCache.has("otp");
      res.should.eql(false);
      res = localCache.set("otp", "some other value");
      true.should.eql(res);
      const otp2 = localCache.take("otp");
      otp2.should.eql("some other value");
      res = localCache.has("otp");
      res.should.eql(false);
    });

    it("take key with falsy values", function () {
      let res = localCache.has("otp");
      res.should.eql(false);
      res = localCache.set("otp", 0);
      true.should.eql(res);
      const otp = localCache.take("otp");
      otp.should.eql(0);
      res = localCache.has("otp");
      res.should.eql(false);
    });

    it("update key (and get it to check if the update worked)", function () {
      let res = localCache.set(state.key, state.value2, 0);
      true.should.eql(res);
      res = localCache.get(state.key);
      state.value2.should.eql(res);
      (1).should.eql(localCache.getStats().keys - state.start.keys);
    });

    it("delete the defined key", function () {
      localCache.once("del", function (key, val) {
        state.key.should.eql(key);
        state.value2.should.eql(val);
      });
      const count = localCache.del(state.key);
      (1).should.eql(count);
      (0).should.eql(localCache.getStats().keys - state.start.keys);
    });

    it("delete multiple keys (after setting them)", function () {
      const keys = ["multiA", "multiB", "multiC"];
      keys.forEach(key => {
        const res = localCache.set(key, state.value3);
        true.should.eql(res);
      });
      keys.forEach(key => {
        const res = localCache.get(key);
        state.value3.should.eql(res);
      });
      let count = localCache.del(keys.slice(0, 2));
      (2).should.eql(count);
      keys.slice(0, 2).forEach(key => {
        const res = localCache.get(key);
        should(res).be.undefined();
      });
      let res = localCache.get(keys[2]);
      state.value3.should.eql(res);
      count = localCache.del(keys[2]);
      (1).should.eql(count);
      res = localCache.get(keys[2]);
      should(res).be.undefined();
      count = localCache.del(keys);
      (0).should.eql(count);
    });

    it("set a key to 0", function () {
      const res = localCache.set("zero", 0);
      true.should.eql(res);
    });

    it("get previously set key", function () {
      const res = localCache.get("zero");
      (0).should.eql(res);
    });

    it("set a key to an object clone", function () {
      const res = localCache.set("clone", state.obj);
      true.should.eql(res);
    });

    it("get cloned object", function () {
      let res = localCache.get("clone");
      state.obj.should.not.equal(res);
      state.obj.should.eql(res);
      res.b.y = 42;
      const res2 = localCache.get("clone");
      state.obj.should.eql(res2);
    });

    it("test promise storage (fulfill before adding to cache)", function (done) {
      const deferred_value = "Some deferred value";
      if (typeof Promise !== "undefined" && Promise !== null) {
        const p = new Promise((fulfill) => fulfill(deferred_value));
        p.then(value => {
          deferred_value.should.eql(value);
        });
        localCache.set("promise", p);
        const q = localCache.get("promise");
        q.then(() => done());
      } else {
        if (process.env.SILENT_MODE == null) {
          console.log(`No Promises available in this node version (${process.version})`);
        }
        this.skip();
      }
    });

    it("test promise storage (fulfill after adding to cache)", function (done) {
      const deferred_value = "Some deferred value";
      if (typeof Promise !== "undefined" && Promise !== null) {
        let called = 0;
        const callStub = () => {
          called++;
          if (called === 2) done();
        };
        const p = new Promise((fulfill) => setTimeout(() => fulfill(deferred_value), 250));
        p.then(value => {
          deferred_value.should.eql(value);
          callStub();
        });
        localCache.set("promise", p);
        const q = localCache.get("promise");
        q.then(value => {
          deferred_value.should.eql(value);
          callStub();
        });
      } else {
        if (process.env.SILENT_MODE == null) {
          console.log(`No Promises available in this node version (${process.version})`);
        }
        this.skip();
      }
    });

    it("test es6 map", function () {
      if (typeof Map === "undefined" || Map === null) {
        if (process.env.SILENT_MODE == null) {
          console.log(`No Maps available in this node version (${process.version})`);
        }
        this.skip();
        return;
      }
      const key = randomString(10);
      const map = new Map([
        ["firstkey", "firstvalue"],
        ["2ndkey", "2ndvalue"],
        ["thirdkey", "thirdvalue"]
      ]);
      localCache.set(key, map);
      map.set("fourthkey", "fourthvalue");
      const cached_map = localCache.get(key);
      should(cached_map.get("2ndkey")).eql("2ndvalue");
      should(cached_map.get("fourthkey")).be.undefined();
    });

    it("test `useClones = true` with an Object", function () {
      const key = randomString(10);
      const value = { a: 123, b: 456 };
      const c = 789;
      localCache.set(key, value);
      value.a = c;
      value.should.not.be.eql(localCache.get(key));
    });

    it("test `useClones = false` with an Object", function () {
      const key = randomString(10);
      const value = { a: 123, b: 456 };
      const c = 789;
      localCacheNoClone.set(key, value);
      value.a = c;
      should(value === localCacheNoClone.get(key)).be.true();
    });
  });

  describe("max key amount", function () {
    before(function () {
      state = {
        key1: randomString(10),
        key2: randomString(10),
        key3: randomString(10),
        value1: randomString(10),
        value2: randomString(10),
        value3: randomString(10)
      };
    });

    it("exceed max key size", function () {
      const setKey = localCacheMaxKeys.set(state.key1, state.value1, 0);
      true.should.eql(setKey);
      const setKey2 = localCacheMaxKeys.set(state.key2, state.value2, 0);
      true.should.eql(setKey2);
      (() => localCacheMaxKeys.set(state.key3, state.value3, 0))
        .should.throw({
          name: "ECACHEFULL",
          message: "Cache max keys amount exceeded"
        });
    });

    it("remove a key and set another one", function () {
      const del = localCacheMaxKeys.del(state.key1);
      (1).should.eql(del);
      const setKey3 = localCacheMaxKeys.set(state.key3, state.value3, 0);
      true.should.eql(setKey3);
    });
  });

  describe("correct and incorrect key types", function () {
    describe("number", function () {
      before(function () {
        state = { keys: [], val: randomString(20) };
        for (let j = 1; j <= 10; j++) {
          state.keys.push(randomNumber(100000));
        }
      });

      it("set", function () {
        state.keys.forEach(key => {
          const res = localCache.set(key, state.val);
          true.should.eql(res);
        });
      });

      it("get", function () {
        const res = localCache.get(state.keys[0]);
        state.val.should.eql(res);
      });

      it("mget", function () {
        const res = localCache.mget(state.keys.slice(0, 2));
        const prediction = {};
        prediction[state.keys[0]] = state.val;
        prediction[state.keys[1]] = state.val;
        prediction.should.eql(res);
      });

      it("del single", function () {
        const count = localCache.del(state.keys[0]);
        (1).should.eql(count);
      });

      it("del multi", function () {
        const count = localCache.del(state.keys.slice(1, 3));
        (2).should.eql(count);
      });

      it("ttl", function (done) {
        const success = localCache.ttl(state.keys[3], 0.3);
        true.should.eql(success);
        let res = localCache.get(state.keys[3]);
        state.val.should.eql(res);
        setTimeout(() => {
          res = localCache.get(state.keys[3]);
          should.not.exist(res);
          done();
        }, 400);
      });

      it("getTtl", function () {
        const now = Date.now();
        const success = localCache.ttl(state.keys[4], 0.5);
        true.should.eql(success);
        const ttl = localCache.getTtl(state.keys[4]);
        ((ttl - now) > 485 && (ttl - now) < 510).should.eql(true);
      });

      after(function () {
        localCache.flushAll(false);
      });
    });

    describe("string", function () {
      before(function () {
        state = { keys: [], val: randomString(20) };
        for (let j = 1; j <= 10; j++) {
          state.keys.push(randomString(10));
        }
      });

      it("set", function () {
        state.keys.forEach(key => {
          const res = localCache.set(key, state.val);
          true.should.eql(res);
        });
      });

      it("get", function () {
        const res = localCache.get(state.keys[0]);
        state.val.should.eql(res);
      });

      it("mget", function () {
        const res = localCache.mget(state.keys.slice(0, 2));
        const prediction = {};
        prediction[state.keys[0]] = state.val;
        prediction[state.keys[1]] = state.val;
        prediction.should.eql(res);
      });

      it("del single", function () {
        const count = localCache.del(state.keys[0]);
        (1).should.eql(count);
      });

      it("del multi", function () {
        const count = localCache.del(state.keys.slice(1, 3));
        (2).should.eql(count);
      });

      it("ttl", function (done) {
        const success = localCache.ttl(state.keys[3], 0.3);
        true.should.eql(success);
        let res = localCache.get(state.keys[3]);
        state.val.should.eql(res);
        setTimeout(() => {
          res = localCache.get(state.keys[3]);
          should.not.exist(res);
          done();
        }, 400);
      });

      it("getTtl", function () {
        const now = Date.now();
        const success = localCache.ttl(state.keys[4], 0.5);
        true.should.eql(success);
        const ttl = localCache.getTtl(state.keys[4]);
        ((ttl - now) > 485 && (ttl - now) < 510).should.eql(true);
      });
    });

    describe("boolean - invalid type", function () {
      before(function () {
        state = { keys: [true, false], val: randomString(20) };
      });

      it("set sync-style", function () {
        (() => localCache.set(state.keys[0], state.val))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `boolean`"
          });
      });

      it("get sync-style", function () {
        (() => localCache.get(state.keys[0]))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `boolean`"
          });
      });

      it("mget sync-style", function () {
        (() => localCache.mget(state.keys))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `boolean`"
          });
      });

      it("del single sync-style", function () {
        (() => localCache.del(state.keys[0]))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `boolean`"
          });
      });

      it("del multi sync-style", function () {
        (() => localCache.del(state.keys))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `boolean`"
          });
      });

      it("ttl sync-style", function () {
        (() => localCache.ttl(state.keys[0], 10))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `boolean`"
          });
      });

      it("getTtl sync-style", function () {
        (() => localCache.getTtl(state.keys[0]))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `boolean`"
          });
      });
    });

    describe("object - invalid type", function () {
      before(function () {
        state = { keys: [{ a: 1 }, { b: 2 }], val: randomString(20) };
      });

      it("set sync-style", function () {
        (() => localCache.set(state.keys[0], state.val))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `object`"
          });
      });

      it("get sync-style", function () {
        (() => localCache.get(state.keys[0]))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `object`"
          });
      });

      it("mget sync-style", function () {
        (() => localCache.mget(state.keys))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `object`"
          });
      });

      it("del single sync-style", function () {
        (() => localCache.del(state.keys[0]))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `object`"
          });
      });

      it("del multi sync-style", function () {
        (() => localCache.del(state.keys))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `object`"
          });
      });

      it("ttl sync-style", function () {
        (() => localCache.ttl(state.keys[0], 10))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `object`"
          });
      });

      it("getTtl sync-style", function () {
        (() => localCache.getTtl(state.keys[0]))
          .should.throw({
            name: "EKEYTYPE",
            message: "The key argument has to be of type `string` or `number`. Found: `object`"
          });
      });
    });
  });

  describe("flush", function () {
    before(function () {
      state = {
        n: 0,
        count: 100,
        startKeys: localCache.getStats().keys,
        keys: [],
        val: randomString(20)
      };
    });

    it("set keys", function () {
      for (let j = 1; j <= state.count; j++) {
        const key = randomString(7);
        state.keys.push(key);
      }
      state.keys.forEach(key => {
        localCache.set(key);
        state.n++;
      });
      state.count.should.eql(state.n);
      (state.startKeys + state.count).should.eql(localCache.getStats().keys);
    });

    it("flush keys", function () {
      localCache.flushAll(false);
      (0).should.eql(localCache.getStats().keys);
      ({}).should.eql(localCache.data);
    });
  });

  describe("flushStats", function () {
    let cache = null;
    before(function () {
      cache = new nodeCache();
    });

    it("set cache and flush stats value", function () {
      const key = randomString(10);
      const value = randomString(10);
      const res = cache.set(key, value);
      true.should.eql(res);
      (1).should.eql(cache.getStats().keys);
      cache.flushStats();
      (0).should.eql(cache.getStats().keys);
      cache.get(key);
      (1).should.eql(cache.getStats().hits);
      cache.get(randomString(10));
      (1).should.eql(cache.getStats().misses);
    });
  });

  describe("many", function () {
    before(function () {
      state = {
        n: 0,
        count: 100000,
        keys: [],
        val: randomString(20)
      };
      for (let j = 1; j <= state.count; j++) {
        const key = randomString(7);
        state.keys.push(key);
      }
    });
  });

  describe("delete", function () {
    this.timeout(0);
    before(function () {
      state.n = 0;
    });
    before(function () {
      state = {
        n: 0,
        count: 100000,
        keys: [],
        val: randomString(20)
      };
      for (let j = 1; j <= state.count; j++) {
        const key = randomString(7);
        state.keys.push(key);
        localCache.set(key, state.val);
      }
    });

    it("delete all previously set keys", function () {
      for (let i = 0; i < state.count; i++) {
        (1).should.eql(localCache.del(state.keys[i]));
        state.n++;
      }
      state.n.should.eql(state.count);
      localCache.getStats().keys.should.eql(0);
    });

    it("delete keys again; should not delete anything", function () {
      for (let i = 0; i < state.count; i++) {
        (0).should.eql(localCache.del(state.keys[i]));
        state.n++;
      }
      state.n.should.eql(state.count * 2);
      localCache.getStats().keys.should.eql(0);
    });
  });

  describe("stats", function () {
    before(function () {
      state = {
        n: 0,
        start: clone(localCache.getStats()),
        count: 5,
        keylength: 7,
        valuelength: 50,
        keys: [],
        values: []
      };
      for (let j = 1; j <= state.count * 2; j++) {
        const key = randomString(state.keylength);
        const value = randomString(state.valuelength);
        state.keys.push(key);
        state.values.push(value);
        true.should.eql(localCache.set(key, value, 0));
        state.n++;
      }
    });

    it("get and remove `count` elements", function () {
      for (let i = 1; i <= state.count; i++) {
        state.values[i].should.eql(localCache.get(state.keys[i]));
        state.n++;
      }
      for (let i = 1; i <= state.count; i++) {
        (1).should.eql(localCache.del(state.keys[i]));
        state.n++;
      }
      const after = localCache.getStats();
      const diff = diffKeys(after, state.start);
      diff.hits.should.eql(5);
      diff.keys.should.eql(5);
      diff.ksize.should.eql(state.count * state.keylength);
      diff.vsize.should.eql(state.count * state.valuelength);
    });

    it("generate `count` misses", function () {
      for (let i = 1; i <= state.count; i++) {
        should(localCache.get("xxxx")).be.undefined();
        state.n++;
      }
      const after = localCache.getStats();
      const diff = diffKeys(after, state.start);
      diff.misses.should.eql(5);
    });

    it("check successful runs", function () {
      state.n.should.eql(5 * state.count);
    });
  });

  describe("multi", function () {
    before(function () {
      state = {
        n: 0,
        count: 100,
        startKeys: localCache.getStats().keys,
        value: randomString(20),
        keys: []
      };
      for (let j = 1; j <= state.count; j++) {
        const key = randomString(7);
        state.keys.push(key);
      }
      state.keys.forEach(key => {
        localCache.set(key, state.value, 0);
        state.n++;
      });
    });

    it("generate a sub-list of keys", function () {
      state.getKeys = state.keys.splice(50, 5);
    });

    it("generate prediction", function () {
      state.prediction = {};
      state.getKeys.forEach(key => {
        state.prediction[key] = state.value;
      });
    });

    it("try to mget with a single key", function () {
      (() => localCache.mget(state.getKeys[0]))
        .should.throw({
          name: "EKEYSTYPE",
          message: "The keys argument has to be an array."
        });
      state.n++;
    });

    it("mget the sub-list", function () {
      state.prediction.should.eql(localCache.mget(state.getKeys));
      state.n++;
    });

    it("delete keys in the sub-list", function () {
      state.getKeys.length.should.eql(localCache.del(state.getKeys));
      state.n++;
    });

    it("try to mget the sub-list again", function () {
      ({}).should.eql(localCache.mget(state.getKeys));
      state.n++;
    });

    it("check successful runs", function () {
      state.n.should.eql(state.count + 4);
    });
  });

  describe("ttl", function () {
    before(function () {
      state = {
        n: 0,
        val: randomString(20),
        key1: `k1_${randomString(20)}`,
        key2: `k2_${randomString(20)}`,
        key3: `k3_${randomString(20)}`,
        key4: `k4_${randomString(20)}`,
        key5: `k5_${randomString(20)}`,
        key6: `k6_${randomString(20)}`,
        now: Date.now()
      };
      state.keys = [state.key1, state.key2, state.key3, state.key4, state.key5];
    });

    describe("has validates expired ttl", function () {
      it("set a key with ttl", function () {
        true.should.eql(localCacheTTL.set(state.key6, state.val, 0.7));
      });

      it("check this key immediately", function () {
        true.should.eql(localCacheTTL.has(state.key6));
      });

      it("before it times out", function (done) {
        setTimeout(() => {
          state.n++;
          const res = localCacheTTL.has(state.key6);
          res.should.eql(true);
          state.val.should.eql(localCacheTTL.get(state.key6));
          done();
        }, 20);
      });

      it("and after it timed out", function (done) {
        setTimeout(() => {
          const res = localCacheTTL.has(state.key6);
          res.should.eql(false);
          state.n++;
          should(localCacheTTL.get(state.key6)).be.undefined();
          done();
        }, 800);
      });
    });

    it("set a key with ttl", function () {
      const res = localCache.set(state.key1, state.val, 0.7);
      true.should.eql(res);
      const ts = localCache.getTtl(state.key1);
      if (state.now < ts && ts < state.now + 300) {
        throw new Error("Invalid timestamp");
      }
    });

    it("check this key immediately", function () {
      state.val.should.eql(localCache.get(state.key1));
    });

    it("before it times out", function (done) {
      setTimeout(() => {
        state.n++;
        const res = localCache.has(state.key1);
        res.should.eql(true);
        state.val.should.eql(localCache.get(state.key1));
        done();
      }, 20);
    });

    it("and after it timed out", function (done) {
      setTimeout(() => {
        const res = localCache.has(state.key1);
        res.should.eql(false);
        const ts = localCache.getTtl(state.key1);
        should.not.exist(ts);
        state.n++;
        should(localCache.get(state.key1)).be.undefined();
        done();
      }, 700);
    });

    it("set another key with ttl", function () {
      const res = localCache.set(state.key2, state.val, 0.5);
      true.should.eql(res);
    });

    it("check this key immediately", function () {
      const res = localCache.get(state.key2);
      state.val.should.eql(res);
    });

    it("before it times out", function (done) {
      setTimeout(() => {
        state.n++;
        state.val.should.eql(localCache.get(state.key2));
        done();
      }, 20);
    });

    it("and after it timed out, too", function (done) {
      setTimeout(() => {
        const ts = localCache.getTtl(state.key2);
        should.not.exist(ts);
        state.n++;
        should(localCache.get(state.key2)).be.undefined();
        done();
      }, 500);
    });

    describe("test the automatic check", function () {
      let innerState = null;
      before(function (done) {
        setTimeout(() => {
          innerState = {
            startKeys: localCache.getStats().keys,
            key: "autotest",
            val: randomString(20)
          };
          done();
        }, 1000);
      });

      it("set a key with ttl", function () {
        localCache.once("set", key => {
          innerState.key.should.eql(key);
        });
        true.should.eql(localCache.set(innerState.key, innerState.val, 0.5));
        (innerState.startKeys + 1).should.eql(localCache.getStats().keys);
        (0).should.eql(localCache.listeners("set").length);
      });

      it("and check it's existence", function () {
        innerState.val.should.eql(localCache.get(innerState.key));
      });

      it("wait for 'expired' event", function (done) {
        localCache.once("expired", (key, val) => {
          innerState.key.should.eql(key);
          (indexOf.call(state.keys, key) < 0).should.eql(true);
          should(localCache.data[key]).be.undefined();
          done();
        });
        setTimeout(() => {
          localCache._checkData(false);
        }, 550);
      });
    });

    describe("more ttl tests", function () {
      it("set a third key with ttl", function () {
        true.should.eql(localCache.set(state.key3, state.val, 100));
      });

      it("check it immediately", function () {
        state.val.should.eql(localCache.get(state.key3));
      });

      it("set ttl to the invalid key", function () {
        false.should.eql(localCache.ttl(`${state.key3}false`, 0.3));
      });

      it("set ttl to the correct key", function () {
        true.should.eql(localCache.ttl(state.key3, 0.3));
      });

      it("check if the key still exists", function () {
        const res = localCache.get(state.key3);
        state.val.should.eql(res);
      });

      it("wait until ttl has ended and check if the key was deleted", function (done) {
        setTimeout(() => {
          const res = localCache.get(state.key3);
          should(res).be.undefined();
          should(localCache.data[state.key3]).be.undefined();
          done();
        }, 500);
      });

      it("set a key with ttl = 100s (default: infinite), reset its ttl to default and check if it still exists", function () {
        const res = localCache.set(state.key4, state.val, 100);
        true.should.eql(res);
        state.val.should.eql(localCache.get(state.key4));
        false.should.eql(localCache.ttl(`${state.key4}false`));
        true.should.eql(localCache.ttl(state.key4));
        const res2 = localCache.get(state.key4);
        state.val.should.eql(res2);
      });

      it("set a key with ttl = 100s (default: 0.3s), reset its ttl to default, check if it still exists, and wait for its timeout", function (done) {
        true.should.eql(localCacheTTL.set(state.key5, state.val, 100));
        state.val.should.eql(localCacheTTL.get(state.key5));
        false.should.eql(localCacheTTL.ttl(`${state.key5}false`));
        true.should.eql(localCacheTTL.ttl(state.key5));
        state.val.should.eql(localCacheTTL.get(state.key5));
        setTimeout(() => {
          const res = localCacheTTL.get(state.key5);
          should.not.exist(res);
          localCacheTTL._checkData(false);
          should(localCacheTTL.data[state.key5]).be.undefined();
          done();
        }, 350);
      });

      it("set a key with a cache initialized with no automatic delete on expire", function (done) {
        localCacheNoDelete.set(state.key1, state.val);
        setTimeout(() => {
          const res = localCacheNoDelete.get(state.key1);
          should(res).eql(state.val);
          done();
        }, 500);
      });

      it("test issue #78 with expire event not fired", function (done) {
        this.timeout(6000);
        const localCacheTTL2 = new nodeCache({ stdTTL: 1, checkperiod: 0.5 });
        let expCount = 0;
        const expkeys = ["ext78_test:a", "ext78_test:b"];
        localCacheTTL2.set(expkeys[0], expkeys[0], 2);
        localCacheTTL2.set(expkeys[1], expkeys[1], 3);
        localCacheTTL2.on("expired", (key, value) => {
          key.should.eql(expkeys[expCount]);
          value.should.eql(expkeys[expCount]);
          expCount++;
        });
        setTimeout(() => {
          expCount.should.eql(2);
          localCacheTTL2.close();
          done();
        }, 5000);
      });
    });
  });

  describe("clone", function () {
    it("a function", function (done) {
      const key = randomString(10);
      const value = () => { done(); };
      localCache.set(key, value);
      const fn = localCache.get(key);
      fn();
    });

    it("a regex", function () {
      const key = randomString(10);
      const regex = new RegExp("\\b\\w{4}\\b", "g");
      const match = "king";
      const noMatch = "bla";
      true.should.eql(regex.test(match));
      false.should.eql(regex.test(noMatch));
      localCache.set(key, regex);
      const cachedRegex = localCache.get(key);
      true.should.eql(cachedRegex.test(match));
      false.should.eql(cachedRegex.test(noMatch));
    });
  });

  describe("mset", function () {
    before(function () {
      state = {
        keyValueSet: [
          { key: randomString(10), val: randomString(10) },
          { key: randomString(10), val: randomString(10) }
        ]
      };
    });

    it("mset an array of key value pairs", function () {
      const res = localCacheMset.mset(state.keyValueSet);
      true.should.eql(res);
      (2).should.eql(localCacheMset.getStats().keys);
    });

    it("mset - integer key", function () {
      localCacheMset.flushAll();
      state.keyValueSet[0].key = randomNumber(10);
      const res = localCacheMset.mset(state.keyValueSet);
      true.should.eql(res);
      (2).should.eql(localCacheMset.getStats().keys);
    });

    it("mset - boolean key throw error", function () {
      localCacheMset.flushAll();
      state.keyValueSet[0].key = true;
      (() => localCacheMset.mset(state.keyValueSet))
        .should.throw({
          name: "EKEYTYPE",
          message: "The key argument has to be of type `string` or `number`. Found: `boolean`"
        });
    });

    it("mset - object key throw error", function () {
      localCacheMset.flushAll();
      state.keyValueSet[0].key = { a: 1 };
      (() => localCacheMset.mset(state.keyValueSet))
        .should.throw({
          name: "EKEYTYPE",
          message: "The key argument has to be of type `string` or `number`. Found: `object`"
        });
    });

    it("mset - ttl type error check", function () {
      localCacheMset.flushAll();
      state.keyValueSet[0].ttl = { a: 1 };
      (() => localCacheMset.mset(state.keyValueSet))
        .should.throw({
          name: "ETTLTYPE",
          message: "The ttl argument has to be a number."
        });
    });
  });

  describe("fetch", function () {
    beforeEach(function () {
      localCache.flushAll();
      state = { func: () => "foo" };
    });

    context("when value is type of Function", function () {
      it("execute it and fetch returned value", function () {
        "foo".should.eql(localCache.fetch("key", 100, state.func));
      });
    });

    context("when value is not a function", function () {
      it("return the value itself", function () {
        "bar".should.eql(localCache.fetch("key", 100, "bar"));
      });
    });

    context("cache hit", function () {
      it("return cached value", function () {
        localCache.set("key", "bar", 100);
        "bar".should.eql(localCache.fetch("key", 100, state.func));
      });
    });

    context("cache miss", function () {
      it("write given value to cache and return it", function () {
        "foo".should.eql(localCache.fetch("key", 100, state.func));
        "foo".should.eql(localCache.get("key"));
      });
    });

    context("when ttl is omitted", function () {
      it("swap ttl and value", function () {
        "foo".should.eql(localCache.fetch("key", state.func));
      });
    });
  });

  describe("Issues", function () {
    describe("#151 - cannot set null", function () {
      let cache = null;
      before(function () {
        cache = new nodeCache();
      });
      it("set the value `null` - this should not throw or otherwise fail", function () {
        cache.set("test", null);
      });
      it("should also return `null`", function () {
        should(cache.get("test")).be.null();
      });
    });

    describe("#197 - ReferenceError: Buffer is not defined", function () {
      let cache = null;
      const globalBuffer = global.Buffer;
      before(function () {
        global.Buffer = undefined;
        cache = new nodeCache();
      });
      it("should not throw when setting a key of type `object` when `Buffer` is not available", function () {
        should(Buffer).be.undefined();
        cache.set("foo", {});
      });
      after(function () {
        global.Buffer = globalBuffer;
        should(Buffer).eql(globalBuffer);
      });
    });

    describe("#263 - forceString never works", function () {
      let cache = null;
      before(function () {
        cache = new nodeCache({ forceString: true });
      });
      it("set the value `null` - this should transform into a string", function () {
        cache.set("test", null);
        should(cache.get("test")).eql("null");
      });
      it("set the value `{ hello: 'World' }` - this should transform into a string", function () {
        cache.set("test", { hello: "World" });
        should(cache.get("test")).eql('{"hello":"World"}');
      });
    });
  });
});
