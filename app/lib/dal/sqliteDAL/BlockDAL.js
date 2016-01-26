/**
 * Created by cgeek on 22/08/15.
 */

var Q = require('q');
var co = require('co');
var AbstractSQLite = require('./AbstractSQLite');

module.exports = BlockDAL;

const IS_FORK = true;
const IS_NOT_FORK = false;

function BlockDAL(db) {

  "use strict";

  AbstractSQLite.call(this, db);

  let current = null;
  let that = this;

  this.table = 'block';
  this.fields = ['fork', 'hash', 'signature', 'currency', 'issuer', 'parameters', 'previousHash', 'previousIssuer', 'version', 'membersCount', 'monetaryMass', 'UDTime', 'medianTime', 'dividend', 'time', 'powMin', 'number', 'nonce', 'transactions', 'certifications', 'identities', 'joiners', 'actives', 'leavers', 'excluded'];
  this.arrays = ['identities','certifications','actives','excluded','leavers','joiners','transactions'];
  this.bigintegers = ['monetaryMass','dividend'];
  this.booleans = ['wrong'];
  this.pkFields = ['number','hash'];

  this.init = () => co(function *() {
    return that.exec('BEGIN;' +
      'CREATE TABLE IF NOT EXISTS ' + that.table + ' (' +
      'fork BOOLEAN NOT NULL,' +
      'hash VARCHAR(40) NOT NULL,' +
      'signature VARCHAR(100) NOT NULL,' +
      'currency VARCHAR(50) NOT NULL,' +
      'issuer VARCHAR(50) NOT NULL,' +
      'parameters VARCHAR(255),' +
      'previousHash VARCHAR(50),' +
      'previousIssuer VARCHAR(50),' +
      'version INTEGER NOT NULL,' +
      'membersCount INTEGER NOT NULL,' +
      'monetaryMass INTEGER DEFAULT 0,' +
      'UDTime DATETIME,' +
      'medianTime DATETIME NOT NULL,' +
      'dividend INTEGER,' +
      'time DATETIME NOT NULL,' +
      'powMin INTEGER NOT NULL,' +
      'number INTEGER NOT NULL,' +
      'nonce INTEGER NOT NULL,' +
      'transactions TEXT,' +
      'certifications TEXT,' +
      'identities TEXT,' +
      'joiners TEXT,' +
      'actives TEXT,' +
      'leavers TEXT,' +
      'excluded TEXT,' +
      'created DATETIME DEFAULT NULL,' +
      'updated DATETIME DEFAULT NULL,' +
      'PRIMARY KEY (number,hash)' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_block_hash ON block (hash);' +
      'CREATE INDEX IF NOT EXISTS idx_block_fork ON block (fork);' +
      'COMMIT;', []);
  });

  this.getCurrent = () => co(function *() {
    if (!current) {
      current = (yield that.query('SELECT * FROM block WHERE NOT fork ORDER BY number DESC LIMIT 1'))[0];
    }
    return Q(current);
  });

  this.getBlock = (number) => co(function *() {
    return (yield that.query('SELECT * FROM block WHERE number = ? and NOT fork', [parseInt(number)]))[0];
  });

  this.getAbsoluteBlock = (number, hash) => co(function *() {
    return (yield that.query('SELECT * FROM block WHERE number = ? and hash = ?', [parseInt(number), hash]))[0];
  });

  this.getBlocks = (start, end) => {
    return that.query('SELECT * FROM block WHERE number BETWEEN ? and ? and NOT fork ORDER BY number ASC', [start, end]);
  };

  this.lastBlockWithDividend = () => co(function *() {
    return (yield that.query('SELECT * FROM block WHERE dividend > 0 and NOT fork ORDER BY number DESC LIMIT 1'))[0];
  });

  this.lastBlockOfIssuer = (issuer) => co(function *() {
    return (yield that.query('SELECT * FROM block WHERE issuer = ? and NOT fork ORDER BY number DESC LIMIT 1', [issuer]))[0];
  });

  this.getForkBlocks = () => {
    return that.query('SELECT * FROM block WHERE fork ORDER BY number');
  };

  this.saveBunch = (blocks) => co(function *() {
    let queries = "INSERT INTO block (" + that.fields.join(',') + ") VALUES ";
    for (let i = 0, len = blocks.length; i < len; i++) {
      let block = blocks[i];
      queries += that.toInsertValues(block);
      if (i + 1 < len) {
        queries += ",\n";
      }
    }
    yield that.exec(queries);
  });

  this.saveBlock = (block) => co(function *() {
    if (!current || current.number < block.number) {
      current = block;
    }
    return saveBlockAs(block, IS_NOT_FORK);
  });

  this.saveSideBlock = (block) =>
    saveBlockAs(block, IS_FORK);

  function saveBlockAs(block, fork) {
    return co(function *() {
      block.fork = fork;
      return yield that.saveEntity(block);
    });
  }

  this.setSideBlock = (block, previousBlock) => co(function *() {
    yield that.query('UPDATE block SET fork = ? WHERE number = ? and hash = ?', [true, block.number, block.hash]);
    current = previousBlock;
  });

  this.migrateOldBlocks = () => Q();
}